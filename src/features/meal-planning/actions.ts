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
import { applyMealSwap, listSwapOptions, picksFromPlan, rebuildMealPlan, type InfeasibilityReason, type MealPick, type SwapOption } from "./generate";
import { persistGeneratedPlanAction } from "@/features/auth/persist";
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

const mealPickSchema = z.object({
  recipeId: z.string().regex(/^[a-z0-9-]+$/),
  factor: z.number().min(0.5).max(2),
});

const planDraftSchema = z.object({
  startDate: z.string().refine(isIsoDate),
  generatedOn: z.string().refine(isIsoDate),
  fingerprint: z.string().regex(/^[0-9a-f]{64}$/),
  assignment: z.array(mealPickSchema).optional(),
  planId: z.string().uuid().optional(),
});

function encodePlanDraft(params: {
  startDate: string;
  generatedOn: string;
  fingerprint: string;
  assignment: MealPick[];
  planId?: string;
}): string {
  return JSON.stringify(params);
}

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

function plannerInputOf(env: PlannerEnvironment) {
  if (env.profile.status !== "ok") return null;
  return {
    targets: env.profile.targets,
    mealsPerDay: env.profile.mealsPerDay,
    recipes: env.recipes,
    products: env.pricing.ctx.products,
    rules: env.rules,
    limits: env.limits,
    pricing: env.pricing.ctx,
    budgetGrosze: env.pricing.budget?.weeklyBudgetGrosze ?? null,
    pantry: env.pantry,
  };
}

/** Wynik generatora. Z `assignment` odtwarzamy zapisany / zamieniony plan zamiast szukać od nowa. */
async function plan(
  env: PlannerEnvironment,
  startDate: string,
  assignment?: MealPick[],
): Promise<Blocked | Infeasible | { status: "planned"; view: PlanView; assignment: MealPick[] }> {
  if (env.rules.hasBlockingConflict) return { status: "blocked", reason: "rules_conflict", profile: env.profile };
  const input = plannerInputOf(env);
  if (!input) return { status: "blocked", reason: "profile", profile: env.profile };
  const outcome = assignment ? rebuildMealPlan(input, assignment) : runPlanner(env);
  if (!outcome) return { status: "blocked", reason: "profile", profile: env.profile };
  if (outcome.status === "infeasible") {
    return { status: "infeasible", reasons: outcome.reasons, rejected: rejectedSummary(outcome.rejected), names: namesFor(env.pricing) };
  }
  return {
    status: "planned",
    view: buildPlanView(outcome.plan, env.pricing, env.pantry, startDate),
    assignment: picksFromPlan(outcome.plan),
  };
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
  const fingerprint = planFingerprint(finalDrafts);
  const planId = await persistGeneratedPlanAction({ view: result.view, fingerprint, assignment: result.assignment });
  return {
    status: "planned",
    view: result.view,
    pantryDraft,
    planDraft: encodePlanDraft({
      startDate,
      generatedOn: today,
      fingerprint,
      assignment: result.assignment,
      planId: planId ?? undefined,
    }),
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

  const result = await plan(await loadPlannerEnvironment(clean, parsed.generatedOn), parsed.startDate, parsed.assignment);
  return result.status === "planned" ? { status: "ready", view: result.view } : result;
}

export type SwapListState =
  | { status: "unavailable" }
  | { status: "ready"; mealId: string; leftover: boolean; options: SwapOption[] };

export async function listSwapOptionsAction(drafts: unknown, planDraftJson: unknown, mealId: string): Promise<SwapListState> {
  const loaded = await loadPlanAction(drafts, planDraftJson);
  if (loaded.status !== "ready") return { status: "unavailable" };
  const mealIndex = loaded.view.meals.findIndex((meal) => meal.id === mealId);
  if (mealIndex < 0) return { status: "unavailable" };
  const env = await loadPlannerEnvironment(sanitizePlannerDrafts(drafts), loaded.view.pricedOn);
  const input = plannerInputOf(env);
  if (!input) return { status: "unavailable" };
  const assignment = loaded.view.meals.map((meal) => ({ recipeId: meal.recipeId, factor: meal.factor }));
  const meal = loaded.view.meals[mealIndex];
  return {
    status: "ready",
    mealId,
    leftover: meal.leftoverOfId !== null,
    options: listSwapOptions(input, assignment, mealIndex),
  };
}

export type SwapPlanState = { status: "error"; message: string } | { status: "ok"; view: PlanView; planDraft: string };

export async function swapMealAction(drafts: unknown, planDraftJson: unknown, mealId: string, recipeId: string, factor: number): Promise<SwapPlanState> {
  const m = getMessages().planner.swap;
  if (typeof planDraftJson !== "string" || planDraftJson === "") return { status: "error", message: m.failed };
  let parsed: z.infer<typeof planDraftSchema>;
  try {
    const result = planDraftSchema.safeParse(JSON.parse(planDraftJson));
    if (!result.success) return { status: "error", message: m.failed };
    parsed = result.data;
  } catch {
    return { status: "error", message: m.failed };
  }
  const clean = sanitizePlannerDrafts(drafts);
  if (planFingerprint(clean) !== parsed.fingerprint) return { status: "error", message: m.settingsChanged };
  const env = await loadPlannerEnvironment(clean, parsed.generatedOn);
  const input = plannerInputOf(env);
  if (!input) return { status: "error", message: m.failed };
  const loaded = await plan(env, parsed.startDate, parsed.assignment);
  if (loaded.status !== "planned") return { status: "error", message: m.failed };
  const mealIndex = loaded.view.meals.findIndex((meal) => meal.id === mealId);
  if (mealIndex < 0) return { status: "error", message: m.failed };
  const outcome = applyMealSwap(input, loaded.assignment, mealIndex, recipeId, factor);
  if (outcome.status !== "planned") return { status: "error", message: m.notAllowed };
  const view = buildPlanView(outcome.plan, env.pricing, env.pantry, parsed.startDate);
  const assignment = picksFromPlan(outcome.plan);
  const planId = await persistGeneratedPlanAction({ view, fingerprint: parsed.fingerprint, assignment });
  return {
    status: "ok",
    view,
    planDraft: encodePlanDraft({
      startDate: parsed.startDate,
      generatedOn: parsed.generatedOn,
      fingerprint: parsed.fingerprint,
      assignment,
      planId: planId ?? parsed.planId,
    }),
  };
}
