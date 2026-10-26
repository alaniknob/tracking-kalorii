import { describe, expect, it } from "vitest";
import { ageInYears } from "./age";
import { calculateNutritionTargets } from "./plan";
import type { NutritionInput } from "./types";

const adult: NutritionInput = {
  weightKg: 80,
  heightCm: 180,
  ageYears: 30,
  sex: "male",
  activityLevel: "moderate",
  goal: "maintain",
  healthFlags: [],
  mealsPerDay: 4,
};

describe("calculateNutritionTargets", () => {
  it("zwraca BMR, TDEE, cel i makro dla zdrowej osoby dorosłej", () => {
    const result = calculateNutritionTargets(adult);
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.bmrKcal).toBe(1780);
    expect(result.tdeeKcal).toBe(2760);
    expect(result.goalCalories.kcal).toBe(2760);
    expect(result.kcalPerMeal).toBe(690);
    expect(result.bmi).toBe(24.7);
    expect(result.warnings).toEqual([]);
  });

  it("nie liczy niczego dla osoby niepełnoletniej", () => {
    expect(calculateNutritionTargets({ ...adult, ageYears: 16 })).toEqual({ kind: "restricted", reasons: ["minor"] });
  });

  it("ciąża i karmienie piersią ograniczają funkcję", () => {
    const result = calculateNutritionTargets({
      ...adult,
      sex: "female",
      healthFlags: ["pregnancy", "breastfeeding"],
    });
    expect(result).toEqual({ kind: "restricted", reasons: ["pregnancy", "breastfeeding"] });
  });

  it("choroby i zaburzenia odżywiania ograniczają funkcję", () => {
    const result = calculateNutritionTargets({ ...adult, healthFlags: ["diabetes", "eating_disorder"] });
    expect(result).toEqual({ kind: "restricted", reasons: ["eating_disorder", "health_condition"] });
  });

  it("blokuje redukcję przy niedowadze, ale pokazuje zapotrzebowanie", () => {
    const result = calculateNutritionTargets({ ...adult, weightKg: 55, goal: "lose_weight" });
    expect(result.kind).toBe("goal_blocked");
    if (result.kind !== "goal_blocked") return;
    expect(result.reason).toBe("underweight_weight_loss");
    expect(result.tdeeKcal).toBeGreaterThan(0);
  });

  it("blokuje redukcję do masy docelowej z BMI < 18,5", () => {
    const result = calculateNutritionTargets({ ...adult, goal: "lose_weight", targetWeightKg: 58 });
    expect(result.kind === "goal_blocked" && result.reason).toBe("target_bmi_too_low");
  });

  it("oznacza szacunek dla płci nieokreślonej i wieku poza zakresem wzoru", () => {
    const result = calculateNutritionTargets({ ...adult, sex: "unspecified", ageYears: 82 });
    expect(result.kind === "ok" && result.warnings).toEqual(["sex_unspecified_estimate", "age_outside_formula_range"]);
  });

  it("oznacza ograniczenie celu przez zasady bezpieczeństwa", () => {
    const result = calculateNutritionTargets({
      weightKg: 45,
      heightCm: 150,
      ageYears: 60,
      sex: "female",
      activityLevel: "sedentary",
      goal: "lose_weight",
      healthFlags: [],
      mealsPerDay: 3,
    });
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.goalCalories.limitedBy).toBe("no_safe_deficit");
    expect(result.warnings).toContain("no_safe_deficit");
  });
});

describe("ageInYears", () => {
  it("liczy pełne lata z uwzględnieniem dnia urodzin", () => {
    const birth = new Date("2000-06-15T00:00:00Z");
    expect(ageInYears(birth, new Date("2026-06-14T00:00:00Z"))).toBe(25);
    expect(ageInYears(birth, new Date("2026-06-15T00:00:00Z"))).toBe(26);
  });
});
