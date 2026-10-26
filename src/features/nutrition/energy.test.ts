import { describe, expect, it } from "vitest";
import { ACTIVITY_FACTORS, MIN_DAILY_KCAL } from "./constants";
import { calculateBmi, calculateBmr, calculateGoalCalories, calculateTdee, roundKcal } from "./energy";

describe("calculateBmr (Mifflin–St Jeor)", () => {
  it("liczy BMR dla mężczyzny", () => {
    // 10×80 + 6,25×180 − 5×30 + 5 = 1780
    expect(calculateBmr({ weightKg: 80, heightCm: 180, ageYears: 30, sex: "male" })).toBe(1780);
  });

  it("liczy BMR dla kobiety", () => {
    // 10×60 + 6,25×165 − 5×30 − 161 = 1320,25
    expect(calculateBmr({ weightKg: 60, heightCm: 165, ageYears: 30, sex: "female" })).toBeCloseTo(1320.25);
  });

  it("dla płci nieokreślonej używa średniej stałych (−78)", () => {
    const female = calculateBmr({ weightKg: 60, heightCm: 165, ageYears: 30, sex: "female" });
    const male = calculateBmr({ weightKg: 60, heightCm: 165, ageYears: 30, sex: "male" });
    const unspecified = calculateBmr({ weightKg: 60, heightCm: 165, ageYears: 30, sex: "unspecified" });
    expect(unspecified).toBeCloseTo(1403.25);
    expect(unspecified).toBeGreaterThan(female);
    expect(unspecified).toBeLessThan(male);
  });

  it("maleje z wiekiem o 5 kcal na rok", () => {
    const at30 = calculateBmr({ weightKg: 70, heightCm: 170, ageYears: 30, sex: "female" });
    const at40 = calculateBmr({ weightKg: 70, heightCm: 170, ageYears: 40, sex: "female" });
    expect(at30 - at40).toBe(50);
  });
});

describe("calculateTdee", () => {
  it("mnoży BMR przez współczynnik aktywności", () => {
    expect(calculateTdee(1780, "moderate")).toBeCloseTo(2759);
    expect(calculateTdee(1000, "sedentary")).toBe(1000 * ACTIVITY_FACTORS.sedentary);
  });

  it("rośnie monotonicznie z poziomem aktywności", () => {
    const levels = ["sedentary", "light", "moderate", "active", "very_active"] as const;
    const values = levels.map((level) => calculateTdee(1500, level));
    expect([...values].sort((a, b) => a - b)).toEqual(values);
  });
});

describe("roundKcal / calculateBmi", () => {
  it("zaokrągla do 10 kcal", () => {
    expect(roundKcal(2345.15)).toBe(2350);
    expect(roundKcal(2344.9)).toBe(2340);
  });

  it("liczy BMI", () => {
    expect(calculateBmi(80, 200)).toBe(20);
  });
});

describe("calculateGoalCalories", () => {
  it("utrzymanie = TDEE", () => {
    expect(calculateGoalCalories({ tdeeKcal: 2759, bmrKcal: 1780, goal: "maintain", sex: "male" })).toEqual({
      kcal: 2760,
      adjustmentKcal: 0,
      limitedBy: "none",
    });
  });

  it("redukcja: deficyt 15% TDEE", () => {
    const result = calculateGoalCalories({ tdeeKcal: 2759, bmrKcal: 1780, goal: "lose_weight", sex: "male" });
    expect(result).toEqual({ kcal: 2350, adjustmentKcal: -410, limitedBy: "none" });
  });

  it("redukcja: deficyt ograniczony do 500 kcal/d", () => {
    const tdee = 1780 * 1.9; // 3382
    const result = calculateGoalCalories({ tdeeKcal: tdee, bmrKcal: 1780, goal: "lose_weight", sex: "male" });
    expect(result.kcal).toBe(2880);
    expect(result.limitedBy).toBe("max_adjustment");
  });

  it("redukcja: nigdy poniżej minimum kalorycznego", () => {
    // kobieta 52 kg, 158 cm, 40 lat, siedząca: BMR 1146,5, TDEE 1375,8
    const result = calculateGoalCalories({ tdeeKcal: 1375.8, bmrKcal: 1146.5, goal: "lose_weight", sex: "female" });
    expect(result.kcal).toBe(MIN_DAILY_KCAL.female);
    expect(result.limitedBy).toBe("min_kcal_floor");
  });

  it("redukcja: brak bezpiecznego deficytu, gdy TDEE ≤ minimum", () => {
    const result = calculateGoalCalories({ tdeeKcal: 1111.8, bmrKcal: 926.5, goal: "lose_weight", sex: "female" });
    expect(result).toEqual({ kcal: 1110, adjustmentKcal: 0, limitedBy: "no_safe_deficit" });
  });

  it("zwiększanie masy: nadwyżka 10% max 400 kcal", () => {
    expect(calculateGoalCalories({ tdeeKcal: 2000, bmrKcal: 1500, goal: "gain_weight", sex: "male" }).kcal).toBe(2200);
    const capped = calculateGoalCalories({ tdeeKcal: 4500, bmrKcal: 2400, goal: "gain_weight", sex: "male" });
    expect(capped.kcal).toBe(4900);
    expect(capped.limitedBy).toBe("max_adjustment");
  });

  it("budowa mięśni: nadwyżka 5% max 250 kcal", () => {
    expect(calculateGoalCalories({ tdeeKcal: 2400, bmrKcal: 1700, goal: "build_muscle", sex: "male" }).kcal).toBe(2520);
    expect(calculateGoalCalories({ tdeeKcal: 6000, bmrKcal: 2800, goal: "build_muscle", sex: "male" }).kcal).toBe(6250);
  });
});
