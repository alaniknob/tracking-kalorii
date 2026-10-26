import { KCAL_PER_GRAM } from "@/features/nutrition/constants";
import type { DataCompleteness, NutritionPer100, Product } from "./types";

/** Dopuszczalna rozbieżność kcal deklarowanych vs wyliczonych z makro (błonnik, alkohole cukrowe, zaokrąglenia). */
export const ENERGY_CONSISTENCY_TOLERANCE = 0.15;

/**
 * Poziom kompletności wyliczany z danych (nie wpisywany ręcznie):
 * - complete: wartości odżywcze z błonnikiem + znany skład,
 * - partial: wartości odżywcze bez błonnika lub bez składu,
 * - minimal: brak wartości odżywczych.
 */
export function dataCompleteness(product: Pick<Product, "nutrition" | "allergens">): DataCompleteness {
  if (product.nutrition === null) return "minimal";
  if (product.nutrition.fiberG === null || !product.allergens.ingredientsKnown) return "partial";
  return "complete";
}

/** Czy deklarowana energia zgadza się z makroskładnikami (Atwater) — wykrywa błędy wprowadzania danych. */
export function isEnergyConsistent(n: NutritionPer100): boolean {
  const computed = n.proteinG * KCAL_PER_GRAM.protein + n.carbohydratesG * KCAL_PER_GRAM.carbohydrates + n.fatG * KCAL_PER_GRAM.fat;
  if (n.kcal === 0) return computed < 5;
  return Math.abs(computed - n.kcal) / n.kcal <= ENERGY_CONSISTENCY_TOLERANCE;
}
