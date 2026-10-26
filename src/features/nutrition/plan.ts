import { BMI_THRESHOLDS, MIFFLIN_ST_JEOR } from "./constants";
import { calculateBmi, calculateBmr, calculateGoalCalories, calculateTdee, roundKcal } from "./energy";
import { calculateMacros } from "./macros";
import { getGoalBlockReason, getRestrictionReasons } from "./safety";
import type { NutritionInput, NutritionResult, NutritionWarning } from "./types";

/**
 * Główny punkt wejścia modułu: szacuje zapotrzebowanie (BMR, TDEE) i proponuje cel
 * kaloryczny oraz makroskładniki. Czysta funkcja — bez zależności od React/Next.
 * Zakłada dane już zwalidowane (zob. features/profile/schema.ts).
 */
export function calculateNutritionTargets(input: NutritionInput): NutritionResult {
  const restrictions = getRestrictionReasons(input);
  if (restrictions.length > 0) {
    return { kind: "restricted", reasons: restrictions };
  }

  const warnings: NutritionWarning[] = [];
  if (input.sex === "unspecified") warnings.push("sex_unspecified_estimate");
  const { min, max } = MIFFLIN_ST_JEOR.studiedAgeRange;
  if (input.ageYears < min || input.ageYears > max) warnings.push("age_outside_formula_range");

  const bmi = Math.round(calculateBmi(input.weightKg, input.heightCm) * 10) / 10;
  const bmr = calculateBmr(input);
  const tdee = calculateTdee(bmr, input.activityLevel);
  const bmrKcal = roundKcal(bmr);
  const tdeeKcal = roundKcal(tdee);

  const blockReason = getGoalBlockReason(input);
  if (blockReason) {
    return { kind: "goal_blocked", reason: blockReason, bmi, bmrKcal, tdeeKcal, warnings };
  }

  const goalCalories = calculateGoalCalories({ tdeeKcal: tdee, bmrKcal: bmr, goal: input.goal, sex: input.sex });
  if (goalCalories.limitedBy === "no_safe_deficit") warnings.push("no_safe_deficit");
  else if (goalCalories.limitedBy !== "none") warnings.push("goal_limited_by_safety");

  const macros = calculateMacros({
    kcal: goalCalories.kcal,
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    goal: input.goal,
  });
  if (calculateBmi(input.weightKg, input.heightCm) >= BMI_THRESHOLDS.obesity) warnings.push("obesity_protein_reference");

  return {
    kind: "ok",
    bmi,
    bmrKcal,
    tdeeKcal,
    goalCalories,
    macros,
    kcalPerMeal: roundKcal(goalCalories.kcal / input.mealsPerDay),
    warnings,
  };
}
