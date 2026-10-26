import { describe, expect, it } from "vitest";
import { KCAL_PER_GRAM, PROTEIN_MAX_ENERGY_SHARE } from "./constants";
import { calculateMacros } from "./macros";

describe("calculateMacros", () => {
  it("dzieli energię: białko g/kg, tłuszcz 30%, reszta węglowodany", () => {
    const macros = calculateMacros({ kcal: 2760, weightKg: 80, heightCm: 180, goal: "maintain" });
    expect(macros.proteinG).toBe(96);
    expect(macros.fatG).toBe(92);
    expect(macros.carbohydratesG).toBe(387);
    expect(macros.fiberG).toBe(39);
    expect(macros.proteinReferenceWeightKg).toBe(80);
  });

  it("suma energii z makro ≈ kaloryczność (błąd zaokrągleń < 10 kcal)", () => {
    const kcal = 2140;
    const m = calculateMacros({ kcal, weightKg: 68, heightCm: 172, goal: "lose_weight" });
    const total =
      m.proteinG * KCAL_PER_GRAM.protein + m.fatG * KCAL_PER_GRAM.fat + m.carbohydratesG * KCAL_PER_GRAM.carbohydrates;
    expect(Math.abs(total - kcal)).toBeLessThan(10);
    expect(m.energyShare.protein + m.energyShare.fat + m.energyShare.carbohydrates).toBeCloseTo(1, 1);
  });

  it("przy BMI ≥ 30 liczy białko od masy odpowiadającej BMI 25", () => {
    const m = calculateMacros({ kcal: 2400, weightKg: 120, heightCm: 170, goal: "lose_weight" });
    expect(m.proteinReferenceWeightKg).toBe(72.3);
    expect(m.proteinG).toBe(116);
  });

  it("ogranicza białko do maks. udziału energii", () => {
    const m = calculateMacros({ kcal: 1200, weightKg: 100, heightCm: 200, goal: "build_muscle" });
    expect(m.proteinG).toBe((1200 * PROTEIN_MAX_ENERGY_SHARE) / KCAL_PER_GRAM.protein);
    expect(m.carbohydratesG).toBeGreaterThanOrEqual(0);
  });
});
