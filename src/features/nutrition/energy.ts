import {
  ACTIVITY_FACTORS,
  GOAL_ADJUSTMENTS,
  KCAL_ROUNDING_STEP,
  MIFFLIN_ST_JEOR,
  MIN_DAILY_KCAL,
} from "./constants";
import type { ActivityLevel, BodyMetrics, Goal, GoalCalories, Sex } from "./types";

export function roundKcal(kcal: number): number {
  return Math.round(kcal / KCAL_ROUNDING_STEP) * KCAL_ROUNDING_STEP;
}

/** Podstawowa przemiana materii (BMR) wg Mifflina–St Jeora, kcal/d (bez zaokrąglenia). */
export function calculateBmr({ weightKg, heightCm, ageYears, sex }: BodyMetrics): number {
  const c = MIFFLIN_ST_JEOR;
  return (
    c.weightCoefficient * weightKg + c.heightCoefficient * heightCm - c.ageCoefficient * ageYears + c.sexConstant[sex]
  );
}

/** Całkowite dzienne zapotrzebowanie (TDEE) = BMR × współczynnik aktywności, kcal/d. */
export function calculateTdee(bmrKcal: number, activityLevel: ActivityLevel): number {
  return bmrKcal * ACTIVITY_FACTORS[activityLevel];
}

export function calculateBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function weightForBmi(bmi: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return bmi * heightM * heightM;
}

/**
 * Proponowana kaloryczność — oddzielona od szacowania zapotrzebowania (TDEE).
 * Przy redukcji wynik nigdy nie spada poniżej max(MIN_DAILY_KCAL, BMR);
 * jeśli to minimum nie pozwala na deficyt, zwracamy TDEE z oznaczeniem `no_safe_deficit`.
 */
export function calculateGoalCalories(params: {
  tdeeKcal: number;
  bmrKcal: number;
  goal: Goal;
  sex: Sex;
}): GoalCalories {
  const { tdeeKcal, bmrKcal, goal, sex } = params;
  const { fraction, maxAbsKcal } = GOAL_ADJUSTMENTS[goal];
  const tdee = roundKcal(tdeeKcal);

  const rawAdjustment = tdeeKcal * fraction;
  const cappedAdjustment = Math.sign(rawAdjustment) * Math.min(Math.abs(rawAdjustment), maxAbsKcal);
  let limitedBy: GoalCalories["limitedBy"] = Math.abs(rawAdjustment) > maxAbsKcal ? "max_adjustment" : "none";
  let kcal = roundKcal(tdeeKcal + cappedAdjustment);

  if (cappedAdjustment < 0) {
    const floor = Math.max(MIN_DAILY_KCAL[sex], roundKcal(bmrKcal));
    if (floor >= tdee) {
      return { kcal: tdee, adjustmentKcal: 0, limitedBy: "no_safe_deficit" };
    }
    if (kcal < floor) {
      kcal = floor;
      limitedBy = "min_kcal_floor";
    }
  }

  return { kcal, adjustmentKcal: kcal - tdee, limitedBy };
}
