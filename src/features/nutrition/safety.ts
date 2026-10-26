import { ADULT_AGE_YEARS, BMI_THRESHOLDS } from "./constants";
import { calculateBmi } from "./energy";
import type { GoalBlockReason, NutritionInput, RestrictionReason } from "./types";

const CONDITION_FLAGS = new Set<NutritionInput["healthFlags"][number]>([
  "diabetes",
  "kidney_disease",
  "cardiovascular_disease",
  "other_condition",
]);

/**
 * Sytuacje, w których automatyczne reguły dla zdrowej osoby dorosłej nie mają zastosowania.
 * Kalkulator nie zwraca wtedy żadnych liczb — tylko bezpieczny komunikat.
 */
export function getRestrictionReasons(input: Pick<NutritionInput, "ageYears" | "healthFlags">): RestrictionReason[] {
  const reasons: RestrictionReason[] = [];
  if (input.ageYears < ADULT_AGE_YEARS) reasons.push("minor");
  if (input.healthFlags.includes("pregnancy")) reasons.push("pregnancy");
  if (input.healthFlags.includes("breastfeeding")) reasons.push("breastfeeding");
  if (input.healthFlags.includes("eating_disorder")) reasons.push("eating_disorder");
  if (input.healthFlags.some((flag) => CONDITION_FLAGS.has(flag))) reasons.push("health_condition");
  return reasons;
}

/** Cel, którego aplikacja nie zaproponuje automatycznie (np. redukcja przy niedowadze). */
export function getGoalBlockReason(
  input: Pick<NutritionInput, "goal" | "weightKg" | "heightCm" | "targetWeightKg">,
): GoalBlockReason | null {
  if (input.goal !== "lose_weight") return null;
  if (calculateBmi(input.weightKg, input.heightCm) < BMI_THRESHOLDS.underweight) return "underweight_weight_loss";
  if (
    input.targetWeightKg !== undefined &&
    calculateBmi(input.targetWeightKg, input.heightCm) < BMI_THRESHOLDS.underweight
  ) {
    return "target_bmi_too_low";
  }
  return null;
}
