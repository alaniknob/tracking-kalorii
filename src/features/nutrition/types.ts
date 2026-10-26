export const SEXES = ["female", "male", "unspecified"] as const;
export type Sex = (typeof SEXES)[number];

export const ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "active", "very_active"] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const GOALS = ["lose_weight", "maintain", "gain_weight", "build_muscle"] as const;
export type Goal = (typeof GOALS)[number];

/**
 * Stany i schorzenia, przy których kalkulator NIE stosuje automatycznie reguł
 * dla zdrowej osoby dorosłej. Pole jest opcjonalne (minimalizacja danych).
 */
export const HEALTH_FLAGS = [
  "pregnancy",
  "breastfeeding",
  "diabetes",
  "kidney_disease",
  "cardiovascular_disease",
  "eating_disorder",
  "other_condition",
] as const;
export type HealthFlag = (typeof HEALTH_FLAGS)[number];

export interface BodyMetrics {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: Sex;
}

export interface NutritionInput extends BodyMetrics {
  activityLevel: ActivityLevel;
  goal: Goal;
  targetWeightKg?: number;
  healthFlags: HealthFlag[];
  mealsPerDay: number;
}

export type GoalCaloriesLimit = "none" | "max_adjustment" | "min_kcal_floor" | "no_safe_deficit";

export interface GoalCalories {
  kcal: number;
  adjustmentKcal: number;
  limitedBy: GoalCaloriesLimit;
}

export interface MacroTargets {
  proteinG: number;
  fatG: number;
  carbohydratesG: number;
  fiberG: number;
  /** Udział energii z makroskładników (0–1). */
  energyShare: { protein: number; fat: number; carbohydrates: number };
  /** Masa ciała użyta do wyliczenia białka (może być skorygowana przy BMI ≥ 30). */
  proteinReferenceWeightKg: number;
}

export type RestrictionReason = "minor" | "pregnancy" | "breastfeeding" | "health_condition" | "eating_disorder";
export type GoalBlockReason = "underweight_weight_loss" | "target_bmi_too_low";
export type NutritionWarning =
  | "sex_unspecified_estimate"
  | "age_outside_formula_range"
  | "obesity_protein_reference"
  | "goal_limited_by_safety"
  | "no_safe_deficit";

export type NutritionResult =
  | { kind: "restricted"; reasons: RestrictionReason[] }
  | {
      kind: "goal_blocked";
      reason: GoalBlockReason;
      bmi: number;
      bmrKcal: number;
      tdeeKcal: number;
      warnings: NutritionWarning[];
    }
  | {
      kind: "ok";
      bmi: number;
      bmrKcal: number;
      tdeeKcal: number;
      goalCalories: GoalCalories;
      macros: MacroTargets;
      kcalPerMeal: number;
      warnings: NutritionWarning[];
    };
