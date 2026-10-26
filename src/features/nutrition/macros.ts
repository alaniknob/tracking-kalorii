import {
  BMI_THRESHOLDS,
  FAT_ENERGY_SHARE,
  FIBER_G_PER_1000_KCAL,
  KCAL_PER_GRAM,
  PROTEIN_G_PER_KG,
  PROTEIN_MAX_ENERGY_SHARE,
} from "./constants";
import { calculateBmi, weightForBmi } from "./energy";
import type { Goal, MacroTargets } from "./types";

/**
 * Rozkład makroskładników dla zadanej kaloryczności:
 * 1. białko = g/kg (wg celu) × masa referencyjna, max PROTEIN_MAX_ENERGY_SHARE energii,
 * 2. tłuszcz = FAT_ENERGY_SHARE energii,
 * 3. węglowodany = pozostała energia.
 */
export function calculateMacros(params: { kcal: number; weightKg: number; heightCm: number; goal: Goal }): MacroTargets {
  const { kcal, weightKg, heightCm, goal } = params;

  const bmi = calculateBmi(weightKg, heightCm);
  const proteinReferenceWeightKg =
    bmi >= BMI_THRESHOLDS.obesity ? weightForBmi(BMI_THRESHOLDS.proteinReference, heightCm) : weightKg;

  const proteinByWeight = proteinReferenceWeightKg * PROTEIN_G_PER_KG[goal];
  const proteinByEnergyCap = (kcal * PROTEIN_MAX_ENERGY_SHARE) / KCAL_PER_GRAM.protein;
  const proteinG = Math.round(Math.min(proteinByWeight, proteinByEnergyCap));
  const fatG = Math.round((kcal * FAT_ENERGY_SHARE) / KCAL_PER_GRAM.fat);
  const remainingKcal = kcal - proteinG * KCAL_PER_GRAM.protein - fatG * KCAL_PER_GRAM.fat;
  const carbohydratesG = Math.max(0, Math.round(remainingKcal / KCAL_PER_GRAM.carbohydrates));
  const fiberG = Math.round((kcal / 1000) * FIBER_G_PER_1000_KCAL);

  return {
    proteinG,
    fatG,
    carbohydratesG,
    fiberG,
    energyShare: {
      protein: (proteinG * KCAL_PER_GRAM.protein) / kcal,
      fat: (fatG * KCAL_PER_GRAM.fat) / kcal,
      carbohydrates: (carbohydratesG * KCAL_PER_GRAM.carbohydrates) / kcal,
    },
    proteinReferenceWeightKg: Math.round(proteinReferenceWeightKg * 10) / 10,
  };
}
