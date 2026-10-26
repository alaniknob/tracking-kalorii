import { createHash } from "node:crypto";
import type { GoalBlockReason, RestrictionReason } from "@/features/nutrition/types";
import { loadPricingEnvironment, sanitizeDrafts, type PricingDrafts, type PricingEnvironment } from "@/features/pricing/environment";
import { todayInPoland } from "@/features/pricing/dates";
import { resolveRulesFromDrafts } from "@/features/preferences/evaluate";
import type { FoodRules } from "@/features/preferences/rules";
import { evaluateProfile } from "@/features/profile/calculate";
import { profileDraftSchema } from "@/features/profile/schema";
import { catalog } from "@/features/recipes/catalog";
import type { Recipe } from "@/features/recipes/types";
import { NO_PRACTICAL_LIMITS, type PracticalLimits } from "./candidates";
import { generateMealPlan, type PlanOutcome, type PlanTargets } from "./generate";
import { parsePantryDraft, type PantryItem } from "./pantry";

/** Wszystkie wersje robocze z sessionStorage potrzebne generatorowi (niezaufane). */
export interface PlannerDrafts extends Required<PricingDrafts> {
  diet: string;
  restrictions: string;
  profile: string;
  pantry: string;
}

const str = (value: unknown) => (typeof value === "string" ? value : "");

export function sanitizePlannerDrafts(drafts: unknown): PlannerDrafts {
  const d = (drafts && typeof drafts === "object" ? drafts : {}) as Record<string, unknown>;
  const pricing = sanitizeDrafts(d);
  return {
    stores: pricing.stores ?? "",
    budget: pricing.budget ?? "",
    priceImport: pricing.priceImport ?? "",
    diet: str(d.diet),
    restrictions: str(d.restrictions),
    profile: str(d.profile),
    pantry: str(d.pantry),
  };
}

export type ProfileStatus =
  | { status: "missing" }
  | { status: "invalid" }
  | { status: "restricted"; reasons: RestrictionReason[] }
  | { status: "goal_blocked"; reason: GoalBlockReason }
  | { status: "ok"; targets: PlanTargets; mealsPerDay: number };

/** Profil jest liczony od nowa przy każdym użyciu — wynik nie jest zapisywany ani logowany. */
function readProfile(json: string, today: string): ProfileStatus {
  if (json.trim() === "") return { status: "missing" };
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { status: "invalid" };
  }
  const values = profileDraftSchema.safeParse(raw);
  if (!values.success) return { status: "invalid" };
  const state = evaluateProfile(values.data, new Date(`${today}T12:00:00Z`));
  if (state.status !== "success") return { status: "invalid" };
  const result = state.result;
  if (result.kind === "restricted") return { status: "restricted", reasons: result.reasons };
  if (result.kind === "goal_blocked") return { status: "goal_blocked", reason: result.reason };
  return {
    status: "ok",
    mealsPerDay: state.mealsPerDay,
    targets: {
      kcal: result.goalCalories.kcal,
      proteinG: result.macros.proteinG,
      fatG: result.macros.fatG,
      carbohydratesG: result.macros.carbohydratesG,
    },
  };
}

export interface PlannerEnvironment {
  pricing: PricingEnvironment;
  profile: ProfileStatus;
  rules: FoodRules;
  hasDiet: boolean;
  hasRestrictions: boolean;
  limits: PracticalLimits;
  pantry: PantryItem[];
  recipes: Recipe[];
}

export async function loadPlannerEnvironment(drafts: PlannerDrafts, today = todayInPoland()): Promise<PlannerEnvironment> {
  const pricing = await loadPricingEnvironment(drafts, today);
  const { diet, rules } = resolveRulesFromDrafts(drafts.diet, drafts.restrictions, pricing.products);
  const hasRestrictions = resolveRulesFromDrafts("", drafts.restrictions).hasSettings;
  const limits: PracticalLimits = diet
    ? {
        maxPrepMinutes: diet.maxPrepMinutes,
        difficulty: diet.difficulty,
        equipment: diet.equipment,
        maxIngredients: diet.maxIngredients,
        useLeftovers: diet.useLeftovers,
      }
    : NO_PRACTICAL_LIMITS;
  return {
    pricing,
    profile: readProfile(drafts.profile, today),
    rules,
    hasDiet: diet !== null,
    hasRestrictions,
    limits,
    pantry: parsePantryDraft(drafts.pantry, pricing.ctx.products),
    recipes: await catalog.listRecipes(),
  };
}

/**
 * Odcisk ustawień, z których powstał plan. Plan nie jest zapisywany — odtwarza się go z tych
 * samych ustawień i daty wyceny; inny odcisk = ustawienia zmieniły się od wygenerowania.
 */
export function planFingerprint(drafts: PlannerDrafts): string {
  const keys = ["profile", "diet", "restrictions", "stores", "budget", "priceImport", "pantry"] as const;
  return createHash("sha256")
    .update(JSON.stringify(keys.map((k) => drafts[k])))
    .digest("hex");
}

/** null = profil nie pozwala wyznaczyć celu (generator nie działa bez celu kalorycznego). */
export function runPlanner(env: PlannerEnvironment): PlanOutcome | null {
  if (env.profile.status !== "ok") return null;
  return generateMealPlan({
    targets: env.profile.targets,
    mealsPerDay: env.profile.mealsPerDay,
    recipes: env.recipes,
    products: env.pricing.ctx.products,
    rules: env.rules,
    limits: env.limits,
    pricing: env.pricing.ctx,
    budgetGrosze: env.pricing.budget?.weeklyBudgetGrosze ?? null,
    pantry: env.pantry,
  });
}
