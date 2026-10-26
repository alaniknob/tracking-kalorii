import { diagnoseBudget, findCheaperAlternatives, type BudgetDiagnosis } from "@/features/budget/diagnose";
import { KCAL_PER_GRAM } from "@/features/nutrition/constants";
import { confirmedTotal, costNeeds, indexOffers, type BasketCost, type Need, type OfferIndex, type PricingContext } from "@/features/pricing/cost";
import type { FoodGroup, KitchenEquipment } from "@/features/preferences/diet-styles";
import type { FoodRules } from "@/features/preferences/rules";
import type { Product } from "@/features/products/types";
import { evaluateProductFit } from "@/features/recipes/fit";
import type { Recipe } from "@/features/recipes/types";
import { screenRecipes, slotsForRecipe, PRACTICAL_REASONS, type Candidate, type PracticalLimits, type PracticalReason, type RejectedRecipe } from "./candidates";
import {
  DAY_LAYOUTS,
  KCAL_TOLERANCE,
  LEFTOVER_SLOTS,
  MACRO_BANDS,
  MAX_SAME_RECIPE_PER_WEEK,
  MAX_SEARCH_PASSES,
  PLAN_DAYS,
  PORTION_FACTORS,
  REQUIRED_GROUP_MIN_PER_WEEK,
  SOFT_WEIGHTS as W,
  type MealSlot,
} from "./constants";
import type { PantryItem } from "./pantry";

export interface PlanTargets {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbohydratesG: number;
}

export interface PlannerInput {
  targets: PlanTargets;
  mealsPerDay: number;
  recipes: readonly Recipe[];
  products: ReadonlyMap<string, Product>;
  rules: FoodRules;
  limits: PracticalLimits;
  pricing: PricingContext;
  /** null = użytkownik nie ustawił budżetu. */
  budgetGrosze: number | null;
  pantry: readonly PantryItem[];
}

export type Remedy =
  | { code: "raise_prep_time"; minutes: number }
  | { code: "allow_medium_difficulty" }
  | { code: "add_equipment"; equipment: KitchenEquipment[] }
  | { code: "raise_max_ingredients"; count: number }
  | { code: "review_diet" }
  | { code: "verify_products" }
  | { code: "more_meals_per_day" }
  | { code: "fewer_meals_per_day" };

export type InfeasibilityReason =
  | {
      code: "no_recipes_for_slot";
      slot: MealSlot;
      /** Przepisy tego typu w katalogu i powody odrzucenia (przepis może mieć kilka). */
      total: number;
      excludedByRules: number;
      needsVerification: number;
      practical: Record<PracticalReason, number>;
      remedies: Remedy[];
    }
  | { code: "energy_out_of_reach"; direction: "too_high" | "too_low"; targetKcal: number; minKcal: number; maxKcal: number; remedies: Remedy[] };

export type PlanWarning =
  | { code: "days_off_target"; days: number[] }
  | { code: "macro_off"; macro: keyof typeof MACRO_BANDS; direction: "low" | "high"; averageShare: number }
  | { code: "required_group_missing"; group: FoodGroup }
  | { code: "missing_prices"; productIds: string[] }
  | { code: "estimated_prices"; count: number }
  | { code: "incomplete_nutrition"; recipeIds: string[] }
  | { code: "verification_skipped"; count: number }
  /** Przepis gotowany częściej niż limit — zwykle cena zmieszczenia się w budżecie (budżet > różnorodność). */
  | { code: "low_variety"; recipeId: string; times: number }
  | { code: "no_budget" };

export interface PlannedMeal {
  day: number;
  slot: MealSlot;
  recipe: Recipe;
  factor: number;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbohydratesG: number;
  nutritionComplete: boolean;
  /** Indeks posiłku (w `meals`), z którego to są resztki; null = gotowane na bieżąco. */
  leftoverOf: number | null;
  /** Indeks posiłku, który jest resztkami z tego (gotuj od razu więcej). */
  leftoverFor: number | null;
  prepMinutes: number;
  needs: Need[];
  preferredHits: string[];
}

export interface DayTotals {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbohydratesG: number;
  withinTolerance: boolean;
}

export interface GeneratedPlan {
  slots: MealSlot[];
  meals: PlannedMeal[];
  days: DayTotals[];
  targets: PlanTargets;
  /** Koszt wszystkich potrzeb bez zapasów: koszt zużytych składników i koniecznych opakowań. */
  full: BasketCost;
  /** Koszyk do kupienia (potrzeby minus zapasy) — porównywany z budżetem. */
  basket: BasketCost;
  pantryUsed: { productId: string; usedBase: number; availableBase: number }[];
  budget: BudgetDiagnosis | null;
  warnings: PlanWarning[];
  status: "ok" | "warnings" | "over_budget";
}

export type PlanOutcome =
  | { status: "infeasible"; reasons: InfeasibilityReason[]; rejected: RejectedRecipe[] }
  | { status: "planned"; plan: GeneratedPlan; rejected: RejectedRecipe[] };

interface Option {
  c: number;
  f: number;
}

/**
 * Ocena planu — porównywana leksykograficznie, w kolejności priorytetów z briefu:
 * [grupy wymagane przez dietę, energia poza tolerancją, makro poza pasmami, przekroczenie budżetu,
 *  brak cen (dostępność), cele miękkie: czas, różnorodność, resztki, koszt, dokładność].
 * Alergie i dieta nie są w ocenie — przepisy niezgodne nie są w ogóle kandydatami.
 */
type Score = [number, number, number, number, number, number];

const better = (a: Score, b: Score) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
};

export function generateMealPlan(input: PlannerInput): PlanOutcome {
  const layout = DAY_LAYOUTS[input.mealsPerDay];
  if (!layout) throw new Error(`Unsupported mealsPerDay: ${input.mealsPerDay}`);
  const slots = layout.map((l) => l.slot);
  const { candidates, rejected } = screenRecipes(input.recipes, input.products, input.rules, input.limits);

  const optionsBySlot = new Map<MealSlot, Option[]>();
  for (const slot of new Set(slots)) {
    const options: Option[] = [];
    candidates.forEach((cand, c) => {
      if (cand.slots.includes(slot)) PORTION_FACTORS.forEach((_, f) => options.push({ c, f }));
    });
    optionsBySlot.set(slot, options);
  }

  const reasons: InfeasibilityReason[] = [];
  for (const slot of new Set(slots)) {
    if (optionsBySlot.get(slot)!.length === 0) reasons.push(slotInfeasibility(slot, rejected, input.limits));
  }
  if (reasons.length > 0) return { status: "infeasible", reasons, rejected };

  const kcalOf = (o: Option) => candidates[o.c].perServing.kcal * PORTION_FACTORS[o.f];
  const minKcal = slots.reduce((sum, s) => sum + Math.min(...optionsBySlot.get(s)!.map(kcalOf)), 0);
  const maxKcal = slots.reduce((sum, s) => sum + Math.max(...optionsBySlot.get(s)!.map(kcalOf)), 0);
  const tol = input.targets.kcal * KCAL_TOLERANCE;
  if (input.targets.kcal - tol > maxKcal || input.targets.kcal + tol < minKcal) {
    const tooHigh = input.targets.kcal - tol > maxKcal;
    return {
      status: "infeasible",
      reasons: [
        {
          code: "energy_out_of_reach",
          direction: tooHigh ? "too_high" : "too_low",
          targetKcal: input.targets.kcal,
          minKcal: Math.round(minKcal),
          maxKcal: Math.round(maxKcal),
          remedies: [tooHigh ? { code: "more_meals_per_day" } : { code: "fewer_meals_per_day" }],
        },
      ],
      rejected,
    };
  }

  const evaluator = createEvaluator(input, candidates, slots);
  const assignment = construct(input, candidates, layout, optionsBySlot, evaluator.perServingCost);
  let current = evaluator.score(assignment);

  for (let pass = 0; pass < MAX_SEARCH_PASSES; pass++) {
    let improved = false;
    // Ruch 1: zamiana przepisu na inny we wszystkich jego wystąpieniach (pozwala łączyć opakowania).
    for (let from = 0; from < candidates.length; from++) {
      const positions = assignment.flatMap((o, i) => (o.c === from ? [i] : []));
      if (positions.length === 0) continue;
      let bestTo = -1;
      for (let to = 0; to < candidates.length; to++) {
        if (to === from || !positions.every((i) => candidates[to].slots.includes(slots[i % slots.length]))) continue;
        const saved = positions.map((i) => assignment[i]);
        for (const i of positions) assignment[i] = { c: to, f: assignment[i].f };
        const score = evaluator.score(assignment);
        positions.forEach((i, k) => (assignment[i] = saved[k]));
        if (better(score, current)) {
          current = score;
          bestTo = to;
        }
      }
      if (bestTo >= 0) {
        for (const i of positions) assignment[i] = { c: bestTo, f: assignment[i].f };
        improved = true;
      }
    }
    // Ruch 2: zmiana przepisu lub porcji pojedynczego posiłku.
    for (let i = 0; i < assignment.length; i++) {
      const original = assignment[i];
      let best = original;
      for (const option of optionsBySlot.get(slots[i % slots.length])!) {
        if (option.c === best.c && option.f === best.f) continue;
        assignment[i] = option;
        const score = evaluator.score(assignment);
        if (better(score, current)) {
          current = score;
          best = option;
        }
      }
      assignment[i] = best;
      if (best !== original) improved = true;
    }
    if (!improved) break;
  }

  return {
    status: "planned",
    plan: buildPlan(input, candidates, slots, assignment, evaluator.index, rejected.filter((r) => r.fit.status === "needs_verification").length),
    rejected,
  };
}

function slotInfeasibility(slot: MealSlot, rejected: readonly RejectedRecipe[], limits: PracticalLimits): InfeasibilityReason {
  const forSlot = rejected.filter((r) => slotsForRecipe(r.recipe).includes(slot));
  const practical = Object.fromEntries(PRACTICAL_REASONS.map((r) => [r, 0])) as Record<PracticalReason, number>;
  const allowedByRules = forSlot.filter((r) => r.fit.status === "no_conflict_found");
  for (const r of allowedByRules) for (const reason of r.practical) practical[reason]++;

  const remedies: Remedy[] = [];
  // Najpierw zmiany pojedynczego ograniczenia, które dopuszczą co najmniej jeden przepis.
  const fixableBy = (reason: PracticalReason) => allowedByRules.filter((r) => r.practical.length === 1 && r.practical[0] === reason);
  const byTime = fixableBy("prep_time");
  if (byTime.length > 0) remedies.push({ code: "raise_prep_time", minutes: Math.min(...byTime.map((r) => r.recipe.prepMinutes)) });
  if (fixableBy("difficulty").length > 0) remedies.push({ code: "allow_medium_difficulty" });
  const byEquipment = fixableBy("equipment");
  if (byEquipment.length > 0) {
    const missing = (r: RejectedRecipe) => r.recipe.equipment.filter((e) => !(limits.equipment ?? []).includes(e));
    const fewest = [...byEquipment].sort((a, b) => missing(a).length - missing(b).length)[0];
    remedies.push({ code: "add_equipment", equipment: missing(fewest) });
  }
  const byIngredients = fixableBy("max_ingredients");
  if (byIngredients.length > 0) {
    remedies.push({ code: "raise_max_ingredients", count: Math.min(...byIngredients.map((r) => r.recipe.ingredients.length)) });
  }
  if (remedies.length === 0 && allowedByRules.length > 0) {
    const closest = [...allowedByRules].sort((a, b) => a.practical.length - b.practical.length)[0];
    for (const reason of closest.practical) {
      if (reason === "prep_time") remedies.push({ code: "raise_prep_time", minutes: closest.recipe.prepMinutes });
      if (reason === "difficulty") remedies.push({ code: "allow_medium_difficulty" });
      if (reason === "equipment") {
        remedies.push({ code: "add_equipment", equipment: closest.recipe.equipment.filter((e) => !(limits.equipment ?? []).includes(e)) });
      }
      if (reason === "max_ingredients") remedies.push({ code: "raise_max_ingredients", count: closest.recipe.ingredients.length });
    }
  }
  const excludedByRules = forSlot.filter((r) => r.fit.status === "excluded").length;
  const needsVerification = forSlot.filter((r) => r.fit.status === "needs_verification").length;
  if (needsVerification > 0) remedies.push({ code: "verify_products" });
  if (excludedByRules > 0) remedies.push({ code: "review_diet" });
  return { code: "no_recipes_for_slot", slot, total: forSlot.length, excludedByRules, needsVerification, practical, remedies };
}

/** Wstępny plan: dzień po dniu, posiłek po posiłku — porcja najbliższa udziałowi w energii dnia, z karą za powtórki. */
function construct(
  input: PlannerInput,
  candidates: readonly Candidate[],
  layout: readonly { slot: MealSlot; share: number }[],
  optionsBySlot: ReadonlyMap<MealSlot, Option[]>,
  perServingCost: readonly number[],
): Option[] {
  const assignment: Option[] = [];
  const uses = new Map<number, number>();
  for (let day = 0; day < PLAN_DAYS; day++) {
    const today = new Set<number>();
    for (const { slot, share } of layout) {
      let best: Option | null = null;
      let bestCost = Infinity;
      for (const option of optionsBySlot.get(slot)!) {
        const cand = candidates[option.c];
        const factor = PORTION_FACTORS[option.f];
        const cost =
          Math.abs(cand.perServing.kcal * factor - input.targets.kcal * share) * W.kcalDeviation +
          (uses.get(option.c) ?? 0) * W.recipeRepeat +
          (today.has(option.c) ? W.sameDayRepeat : 0) +
          perServingCost[option.c] * factor * W.costGrosz +
          cand.recipe.prepMinutes * W.prepMinute -
          (cand.preferredHits.length > 0 ? W.preferredMeal : 0);
        if (cost < bestCost) {
          bestCost = cost;
          best = option;
        }
      }
      assignment.push(best!);
      uses.set(best!.c, (uses.get(best!.c) ?? 0) + 1);
      today.add(best!.c);
    }
  }
  return assignment;
}

interface Detail {
  leftoverOf: (number | null)[];
  days: DayTotals[];
  needs: Need[];
  basketNeeds: Need[];
}

function createEvaluator(input: PlannerInput, candidates: readonly Candidate[], slots: readonly MealSlot[]) {
  const index = indexOffers(input.pricing);
  const perDay = slots.length;
  const t = input.targets;
  const pantry = new Map(input.pantry.map((p) => [p.productId, p.baseAmount]));
  const perServingCost = candidates.map((cand) => {
    const cost = costNeeds(cand.needsPerServing, input.pricing, index);
    return confirmedTotal(cost.used) + cost.used.estimated;
  });

  function detail(a: readonly Option[]): Detail {
    const leftoverOf: (number | null)[] = a.map(() => null);
    if (input.limits.useLeftovers) {
      for (let i = perDay; i < a.length; i++) {
        const prev = i - perDay;
        if (
          LEFTOVER_SLOTS.includes(slots[i % perDay]) &&
          a[prev].c === a[i].c &&
          leftoverOf[prev] === null &&
          candidates[a[i].c].recipe.servings >= 2
        ) {
          leftoverOf[i] = prev;
        }
      }
    }
    const days: DayTotals[] = [];
    for (let d = 0; d < PLAN_DAYS; d++) {
      const total = { kcal: 0, proteinG: 0, fatG: 0, carbohydratesG: 0 };
      for (let s = 0; s < perDay; s++) {
        const o = a[d * perDay + s];
        const n = candidates[o.c].perServing;
        const f = PORTION_FACTORS[o.f];
        total.kcal += n.kcal * f;
        total.proteinG += n.proteinG * f;
        total.fatG += n.fatG * f;
        total.carbohydratesG += n.carbohydratesG * f;
      }
      days.push({ ...total, withinTolerance: Math.abs(total.kcal - t.kcal) <= t.kcal * KCAL_TOLERANCE + 1e-9 });
    }
    const merged = new Map<string, number>();
    for (const o of a) {
      const f = PORTION_FACTORS[o.f];
      for (const need of candidates[o.c].needsPerServing) {
        merged.set(need.productId, (merged.get(need.productId) ?? 0) + need.baseAmount * f);
      }
    }
    const needs = [...merged].map(([productId, baseAmount]) => ({ productId, baseAmount }));
    const basketNeeds = needs
      .map((n) => ({ productId: n.productId, baseAmount: n.baseAmount - (pantry.get(n.productId) ?? 0) }))
      .filter((n) => n.baseAmount > 1e-6);
    return { leftoverOf, days, needs, basketNeeds };
  }

  function score(a: readonly Option[]): Score {
    const { leftoverOf, days, basketNeeds } = detail(a);

    let energy = 0;
    let macro = 0;
    let soft = 0;
    for (const day of days) {
      const dev = Math.abs(day.kcal - t.kcal);
      energy += Math.max(0, dev - t.kcal * KCAL_TOLERANCE);
      soft += dev * W.kcalDeviation + Math.abs(day.proteinG - t.proteinG) * W.proteinDeviationG;
      macro += bandViolation(day.proteinG, t.proteinG, MACRO_BANDS.protein) * KCAL_PER_GRAM.protein;
      macro += bandViolation(day.fatG, t.fatG, MACRO_BANDS.fat) * KCAL_PER_GRAM.fat;
      macro += bandViolation(day.carbohydratesG, t.carbohydratesG, MACRO_BANDS.carbohydrates) * KCAL_PER_GRAM.carbohydrates;
    }

    let groupsMissing = 0;
    for (const group of input.rules.requiredGroups) {
      const count = a.filter((o) => candidates[o.c].groups.includes(group)).length;
      if (count < REQUIRED_GROUP_MIN_PER_WEEK) groupsMissing++;
    }

    const cost = costNeeds(basketNeeds, input.pricing, index);
    const required = confirmedTotal(cost.packages) + cost.packages.estimated;
    const used = confirmedTotal(cost.used) + cost.used.estimated;
    const budgetOver = input.budgetGrosze === null ? 0 : Math.max(0, required - input.budgetGrosze);

    const cooked = new Map<number, number>();
    for (let i = 0; i < a.length; i++) {
      const cand = candidates[a[i].c];
      if (leftoverOf[i] === null) {
        cooked.set(a[i].c, (cooked.get(a[i].c) ?? 0) + 1);
        soft += cand.recipe.prepMinutes * W.prepMinute;
      }
      if (cand.preferredHits.length > 0) soft -= W.preferredMeal;
      if (!cand.nutritionComplete) soft += W.incompleteNutrition;
    }
    for (const count of cooked.values()) soft += Math.max(0, count - MAX_SAME_RECIPE_PER_WEEK) * W.recipeRepeat;
    for (let d = 0; d < PLAN_DAYS; d++) {
      const seen = new Set<number>();
      for (let s = 0; s < perDay; s++) {
        const c = a[d * perDay + s].c;
        if (seen.has(c)) soft += W.sameDayRepeat;
        seen.add(c);
      }
    }
    soft += required * W.costGrosz + (required - used) * W.wasteGrosz;

    return [groupsMissing, Math.round(energy), Math.round(macro), budgetOver, cost.missingCount, Math.round(soft)];
  }

  return { score, detail, index, perServingCost };
}

function bandViolation(value: number, target: number, band: { min: number; max: number }): number {
  if (target <= 0) return 0;
  return Math.max(0, band.min * target - value, value - band.max * target);
}

function buildPlan(
  input: PlannerInput,
  candidates: readonly Candidate[],
  slots: readonly MealSlot[],
  assignment: readonly Option[],
  index: OfferIndex,
  verificationSkipped: number,
): GeneratedPlan {
  const evaluator = createEvaluator(input, candidates, slots);
  const { leftoverOf, days, needs, basketNeeds } = evaluator.detail(assignment);
  const perDay = slots.length;

  const meals: PlannedMeal[] = assignment.map((o, i) => {
    const cand = candidates[o.c];
    const factor = PORTION_FACTORS[o.f];
    const n = cand.perServing;
    const r1 = (v: number) => Math.round(v * factor * 10) / 10;
    return {
      day: Math.floor(i / perDay),
      slot: slots[i % perDay],
      recipe: cand.recipe,
      factor,
      kcal: Math.round(n.kcal * factor),
      proteinG: r1(n.proteinG),
      fatG: r1(n.fatG),
      carbohydratesG: r1(n.carbohydratesG),
      nutritionComplete: cand.nutritionComplete,
      leftoverOf: leftoverOf[i],
      leftoverFor: null,
      prepMinutes: leftoverOf[i] === null ? cand.recipe.prepMinutes : 0,
      needs: cand.needsPerServing.map((need) => ({ productId: need.productId, baseAmount: need.baseAmount * factor })),
      preferredHits: cand.preferredHits,
    };
  });
  meals.forEach((meal, i) => {
    if (meal.leftoverOf !== null) meals[meal.leftoverOf].leftoverFor = i;
  });

  const full = costNeeds(needs, input.pricing, index);
  const basket = costNeeds(basketNeeds, input.pricing, index);
  const needByProduct = new Map(needs.map((n) => [n.productId, n.baseAmount]));
  const pantryUsed = input.pantry
    .filter((p) => needByProduct.has(p.productId))
    .map((p) => ({ productId: p.productId, availableBase: p.baseAmount, usedBase: Math.min(p.baseAmount, needByProduct.get(p.productId)!) }));

  let budget: BudgetDiagnosis | null = null;
  if (input.budgetGrosze !== null) {
    const alternatives = findCheaperAlternatives(
      basket.items,
      input.pricing,
      [...input.products.values()],
      (product) => evaluateProductFit(product, input.rules).status === "no_conflict_found",
    );
    budget = diagnoseBudget(basket, { weeklyBudgetGrosze: input.budgetGrosze, allowEstimates: input.pricing.allowEstimates }, alternatives);
  }

  const warnings = planWarnings(input, candidates, assignment, leftoverOf, days, basket);
  if (verificationSkipped > 0) warnings.push({ code: "verification_skipped", count: verificationSkipped });
  const status = budget?.status === "over" ? "over_budget" : warnings.some((w) => w.code !== "no_budget") ? "warnings" : "ok";
  return { slots: [...slots], meals, days, targets: input.targets, full, basket, pantryUsed, budget, warnings, status };
}

function planWarnings(
  input: PlannerInput,
  candidates: readonly Candidate[],
  assignment: readonly Option[],
  leftoverOf: readonly (number | null)[],
  days: readonly DayTotals[],
  basket: BasketCost,
): PlanWarning[] {
  const warnings: PlanWarning[] = [];
  const t = input.targets;
  const offDays = days.flatMap((d, i) => (d.withinTolerance ? [] : [i]));
  if (offDays.length > 0) warnings.push({ code: "days_off_target", days: offDays });

  const avg = (key: "proteinG" | "fatG" | "carbohydratesG") => days.reduce((s, d) => s + d[key], 0) / days.length;
  const macros = [
    ["protein", avg("proteinG"), t.proteinG],
    ["fat", avg("fatG"), t.fatG],
    ["carbohydrates", avg("carbohydratesG"), t.carbohydratesG],
  ] as const;
  for (const [macro, value, target] of macros) {
    if (target <= 0) continue;
    const share = value / target;
    if (share < MACRO_BANDS[macro].min) warnings.push({ code: "macro_off", macro, direction: "low", averageShare: share });
    else if (share > MACRO_BANDS[macro].max) warnings.push({ code: "macro_off", macro, direction: "high", averageShare: share });
  }

  for (const group of input.rules.requiredGroups) {
    if (!assignment.some((o) => candidates[o.c].groups.includes(group))) warnings.push({ code: "required_group_missing", group });
  }
  const missing = basket.items.filter((i) => !i.priced).map((i) => i.productId);
  if (missing.length > 0) warnings.push({ code: "missing_prices", productIds: missing });
  const estimated = basket.items.filter((i) => i.priced && i.choice.offer.status === "estimated").length;
  if (estimated > 0) warnings.push({ code: "estimated_prices", count: estimated });
  const cooked = new Map<string, number>();
  assignment.forEach((o, i) => {
    if (leftoverOf[i] !== null) return;
    const id = candidates[o.c].recipe.id;
    cooked.set(id, (cooked.get(id) ?? 0) + 1);
  });
  for (const [recipeId, times] of cooked) if (times > MAX_SAME_RECIPE_PER_WEEK + 1) warnings.push({ code: "low_variety", recipeId, times });
  const incomplete = [...new Set(assignment.filter((o) => !candidates[o.c].nutritionComplete).map((o) => candidates[o.c].recipe.id))];
  if (incomplete.length > 0) warnings.push({ code: "incomplete_nutrition", recipeIds: incomplete });
  if (input.budgetGrosze === null) warnings.push({ code: "no_budget" });
  return warnings;
}

export const GENERATOR_VERSION = "7";

/** Wybór przepisu i porcji na jeden slot planu — zapisywany, żeby dało się odtworzyć i zamieniać posiłki. */
export interface MealPick {
  recipeId: string;
  factor: number;
}

export function picksFromPlan(plan: GeneratedPlan): MealPick[] {
  return plan.meals.map((meal) => ({ recipeId: meal.recipe.id, factor: meal.factor }));
}

function factorIndex(factor: number): number {
  return PORTION_FACTORS.findIndex((value) => Math.abs(value - factor) < 1e-9);
}

function assignmentFromPicks(
  picks: readonly MealPick[],
  candidates: readonly Candidate[],
  slots: readonly MealSlot[],
): Option[] | null {
  if (picks.length !== PLAN_DAYS * slots.length) return null;
  const byId = new Map(candidates.map((candidate, index) => [candidate.recipe.id, index] as const));
  const assignment: Option[] = [];
  for (let i = 0; i < picks.length; i++) {
    const candidateIndex = byId.get(picks[i].recipeId);
    const f = factorIndex(picks[i].factor);
    if (candidateIndex === undefined || f < 0) return null;
    if (!candidates[candidateIndex].slots.includes(slots[i % slots.length])) return null;
    assignment.push({ c: candidateIndex, f });
  }
  return assignment;
}

/**
 * Odtworzenie planu z zapisanych wyborów (historia, zamiana posiłku) — te same twarde filtry
 * co generator: przepis spoza kandydatów (np. nowa alergia) = brak planu.
 */
export function rebuildMealPlan(input: PlannerInput, picks: readonly MealPick[]): PlanOutcome {
  const layout = DAY_LAYOUTS[input.mealsPerDay];
  if (!layout) throw new Error(`Unsupported mealsPerDay: ${input.mealsPerDay}`);
  const slots = layout.map((item) => item.slot);
  const { candidates, rejected } = screenRecipes(input.recipes, input.products, input.rules, input.limits);
  const assignment = assignmentFromPicks(picks, candidates, slots);
  if (!assignment) {
    return { status: "infeasible", reasons: [], rejected };
  }
  const evaluator = createEvaluator(input, candidates, slots);
  return {
    status: "planned",
    plan: buildPlan(
      input,
      candidates,
      slots,
      assignment,
      evaluator.index,
      rejected.filter((item) => item.fit.status === "needs_verification").length,
    ),
    rejected,
  };
}

export interface SwapOption {
  recipeId: string;
  recipeName: string;
  factor: number;
  kcal: number;
  current: boolean;
  isDemo: boolean;
}

const MAX_SWAP_OPTIONS = 12;

/**
 * Alternatywy zamiany jednego posiłku: tylko przepisy, które przechodzą twarde filtry
 * (alergie, dieta, weryfikacja, czas, sprzęt). Porcja dobierana pod kalorie dnia.
 */
export function listSwapOptions(input: PlannerInput, picks: readonly MealPick[], mealIndex: number): SwapOption[] {
  const layout = DAY_LAYOUTS[input.mealsPerDay];
  if (!layout) return [];
  const slots = layout.map((item) => item.slot);
  const { candidates } = screenRecipes(input.recipes, input.products, input.rules, input.limits);
  const assignment = assignmentFromPicks(picks, candidates, slots);
  if (!assignment || mealIndex < 0 || mealIndex >= assignment.length) return [];
  const evaluator = createEvaluator(input, candidates, slots);
  const slot = slots[mealIndex % slots.length];
  const current = assignment[mealIndex];
  const ranked: { option: SwapOption; score: Score }[] = [];

  for (let c = 0; c < candidates.length; c++) {
    if (!candidates[c].slots.includes(slot)) continue;
    let bestF = 0;
    let bestScore: Score | null = null;
    for (let f = 0; f < PORTION_FACTORS.length; f++) {
      assignment[mealIndex] = { c, f };
      const score = evaluator.score(assignment);
      if (bestScore === null || better(score, bestScore)) {
        bestScore = score;
        bestF = f;
      }
    }
    assignment[mealIndex] = current;
    const factor = PORTION_FACTORS[bestF];
    ranked.push({
      score: bestScore!,
      option: {
        recipeId: candidates[c].recipe.id,
        recipeName: candidates[c].recipe.name,
        factor,
        kcal: Math.round(candidates[c].perServing.kcal * factor),
        current: c === current.c,
        isDemo: candidates[c].recipe.source.isDemo,
      },
    });
  }

  ranked.sort((a, b) => (better(a.score, b.score) ? -1 : better(b.score, a.score) ? 1 : 0));
  const currentOption = ranked.find((item) => item.option.current);
  const others = ranked.filter((item) => !item.option.current).slice(0, MAX_SWAP_OPTIONS);
  return currentOption ? [currentOption.option, ...others.map((item) => item.option)] : others.map((item) => item.option);
}

export function applyMealSwap(
  input: PlannerInput,
  picks: readonly MealPick[],
  mealIndex: number,
  recipeId: string,
  factor: number,
): PlanOutcome {
  if (mealIndex < 0 || mealIndex >= picks.length) {
    return { status: "infeasible", reasons: [], rejected: [] };
  }
  const next = picks.map((pick, index) => (index === mealIndex ? { recipeId, factor } : pick));
  return rebuildMealPlan(input, next);
}
