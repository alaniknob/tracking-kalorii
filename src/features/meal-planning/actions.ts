"use server";

import { z } from "zod";
import { addDays, daysBetween, isIsoDate, todayInPoland } from "@/features/pricing/dates";
import { namesFor, type NameMaps } from "@/features/pricing/names";
import { getMessages } from "@/i18n";
import type { PracticalLimits } from "./candidates";
import { PLAN_START_LIMITS } from "./constants";
import {
  loadPlannerEnvironment,
  planFingerprint,
  runPlanner,
  sanitizePlannerDrafts,
  type PlannerEnvironment,
  type ProfileStatus,
} from "./environment";
import type { InfeasibilityReason } from "./generate";
import { validatePantry, type PantryRow } from "./pantry";
import { buildPlanView, rejectedSummary, type PlanView, type RejectedSummary } from "./view";

export interface PlannerOverview {
  today: string;
  maxStartDate: string;
  profile: ProfileStatus;
  hasDiet: boolean;
  hasRestrictions: boolean;
  rulesConflict: boolean;
  limits: PracticalLimits;
  budgetGrosze: number | null;
  allowEstimates: boolean;
  /** Puste = wszystkie sieci z listy. */
  stores: string[];
  importFile: string | null;
}

function overviewOf(env: PlannerEnvironment): PlannerOverview {
  const today = env.pricing.today;
  return {
    today,
    maxStartDate: addDays(today, PLAN_START_LIMITS.maxDaysAhead),
    profile: env.profile,
    hasDiet: env.hasDiet,
    hasRestrictions: env.hasRestrictions,
    rulesConflict: env.rules.hasBlockingConflict,
    limits: env.limits,
    budgetGrosze: env.pricing.budget?.weeklyBudgetGrosze ?? null,
    allowEstimates: env.pricing.ctx.allowEstimates,
    stores: env.pricing.stores ? env.pricing.selectedStores.map((s) => s.name) : [],
    importFile: env.pricing.importInfo?.fileName ?? null,
  };
}

/** Podsumowanie ustawień, z których skorzysta generator (dane z tej karty, walidowane od nowa). */
export async function plannerOverviewAction(drafts: unknown): Promise<PlannerOverview> {
  return overviewOf(await loadPlannerEnvironment(sanitizePlannerDrafts(drafts)));
}

type Blocked = { status: "blocked"; reason: "profile" | "rules_conflict"; profile: ProfileStatus };
type Infeasible = {
  status: "infeasible";
  reasons: InfeasibilityReason[];
  rejected: RejectedSummary;
  names: NameMaps;
};

export type GeneratePlanState =
  | { status: "idle" }
  | { status: "invalid"; message: string; startDateError: string | null; pantryErrors: { row: number; message: string }[] }
  | (Blocked & { pantryDraft: string })
  | (Infeasible & { pantryDraft: string })
  | { status: "planned"; view: PlanView; pantryDraft: string; planDraft: string };

const planDraftSchema = z.object({
  startDate: z.string().refine(isIsoDate),
  generatedOn: z.string().refine(isIsoDate),
  fingerprint: z.string().regex(/^[0-9a-f]{64}$/),
});

const str = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
};

function readDraftsField(formData: FormData): unknown {
  try {
    return JSON.parse(str(formData, "drafts"));
  } catch {
    return {};
  }
}

/** Wynik generatora dla ustawień z tej karty. Plan nie jest zapisywany na serwerze. */
async function plan(env: PlannerEnvironment, startDate: string): Promise<Blocked | Infeasible | { status: "planned"; view: PlanView }> {
  if (env.rules.hasBlockingConflict) return { status: "blocked", reason: "rules_conflict", profile: env.profile };
  const outcome = runPlanner(env);
  if (!outcome) return { status: "blocked", reason: "profile", profile: env.profile };
  if (outcome.status === "infeasible") {
    return { status: "infeasible", reasons: outcome.reasons, rejected: rejectedSummary(outcome.rejected), names: namesFor(env.pricing) };
  }
  return { status: "planned", view: buildPlanView(outcome.plan, env.pricing, env.pantry, startDate) };
}

export async function generatePlanAction(_prev: GeneratePlanState, formData: FormData): Promise<GeneratePlanState> {
  const m = getMessages().planner.generator;
  const today = todayInPoland();

  const startDate = str(formData, "startDate").trim();
  let startDateError: string | null = null;
  if (!isIsoDate(startDate)) startDateError = m.startDateInvalid;
  else {
    const offset = daysBetween(today, startDate);
    if (offset < 0 || offset > PLAN_START_LIMITS.maxDaysAhead) startDateError = m.startDateRange(PLAN_START_LIMITS.maxDaysAhead);
  }

  const products = formData.getAll("pantryProduct");
  const amounts = formData.getAll("pantryAmount");
  const units = formData.getAll("pantryUnit");
  const rows: PantryRow[] = products.map((p, i) => ({
    productId: typeof p === "string" ? p : "",
    amount: typeof amounts[i] === "string" ? (amounts[i] as string) : "",
    unit: typeof units[i] === "string" ? (units[i] as string) : "",
  }));
  const drafts = sanitizePlannerDrafts(readDraftsField(formData));
  const base = await loadPlannerEnvironment({ ...drafts, pantry: "" }, today);
  const pantry = validatePantry(rows, base.pricing.ctx.products);

  if (startDateError || !pantry.ok) {
    return {
      status: "invalid",
      message: getMessages().validation.formInvalid,
      startDateError,
      pantryErrors: pantry.ok ? [] : pantry.errors,
    };
  }

  const pantryDraft = pantry.items.length > 0 ? JSON.stringify(rows.filter((r) => r.productId !== "" || r.amount.trim() !== "")) : "";
  const finalDrafts = { ...drafts, pantry: pantryDraft };
  const env = { ...base, pantry: pantry.items };
  const result = await plan(env, startDate);
  if (result.status !== "planned") return { ...result, pantryDraft };
  return {
    ...result,
    pantryDraft,
    planDraft: JSON.stringify({ startDate, generatedOn: today, fingerprint: planFingerprint(finalDrafts) }),
  };
}

export type LoadPlanState =
  | { status: "no_plan" }
  | { status: "expired"; generatedOn: string }
  /** Ustawienia zmieniły się od wygenerowania — stary plan mógłby być niezgodny (np. z nową alergią). */
  | { status: "settings_changed" }
  | Blocked
  | Infeasible
  | { status: "ready"; view: PlanView };

/**
 * Odtworzenie planu z ustawień i daty wyceny z chwili generowania — generator jest
 * deterministyczny, więc wynik jest ten sam bez zapisywania planu (do czasu kont, etap 7).
 */
export async function loadPlanAction(drafts: unknown, planDraftJson: unknown): Promise<LoadPlanState> {
  if (typeof planDraftJson !== "string" || planDraftJson === "") return { status: "no_plan" };
  let parsed: z.infer<typeof planDraftSchema>;
  try {
    const result = planDraftSchema.safeParse(JSON.parse(planDraftJson));
    if (!result.success) return { status: "no_plan" };
    parsed = result.data;
  } catch {
    return { status: "no_plan" };
  }
  const today = todayInPoland();
  const age = daysBetween(parsed.generatedOn, today);
  if (age < 0 || age > PLAN_START_LIMITS.maxAgeDays) return { status: "expired", generatedOn: parsed.generatedOn };

  const clean = sanitizePlannerDrafts(drafts);
  if (planFingerprint(clean) !== parsed.fingerprint) return { status: "settings_changed" };

  const result = await plan(await loadPlannerEnvironment(clean, parsed.generatedOn), parsed.startDate);
  return result.status === "planned" ? { status: "ready", view: result.view } : result;
}
