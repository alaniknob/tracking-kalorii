import type { Difficulty, KitchenEquipment } from "@/features/preferences/diet-styles";
import type { DataSource, QuantityUnit } from "@/features/products/types";

export interface RecipeIngredient {
  productId: string;
  /** Ilość produktu w stanie SUROWYM / przed obróbką (tak jak kupowany). */
  amount: number;
  unit: QuantityUnit;
  /** Np. „pokrojona w kostkę”. */
  note: string | null;
}

export const RECIPE_RELIABILITY = ["tested", "estimated", "unverified"] as const;
export type RecipeReliability = (typeof RECIPE_RELIABILITY)[number];

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

/**
 * Przepis. Kalorie, makro i alergeny NIE są polami — zawsze wyliczane ze składników
 * (`calculateRecipeNutrition`, `aggregateRecipeAllergens`).
 */
export interface Recipe {
  id: string;
  name: string;
  description: string;
  mealTypes: MealType[];
  servings: number;
  prepMinutes: number;
  difficulty: Exclude<Difficulty, "any">;
  equipment: KitchenEquipment[];
  ingredients: RecipeIngredient[];
  instructions: string[];
  /** Masa gotowej potrawy w gramach (po obróbce) — null, gdy nieznana. */
  cookedYieldG: number | null;
  source: DataSource;
  reliability: RecipeReliability;
}
