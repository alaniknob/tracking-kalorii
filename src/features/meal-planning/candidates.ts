import type { Need } from "@/features/pricing/cost";
import type { Difficulty, FoodGroup, KitchenEquipment } from "@/features/preferences/diet-styles";
import { matchCatalogProducts, type FoodRules } from "@/features/preferences/rules";
import { recipeNeeds } from "@/features/recipes/cost";
import { evaluateRecipeFit, recipeFoodGroups, type RecipeFit } from "@/features/recipes/fit";
import { calculateRecipeNutrition, type NutritionTotals, type ProductIndex } from "@/features/recipes/nutrition";
import type { Recipe } from "@/features/recipes/types";
import { MEAL_SLOTS, SLOT_MEAL_TYPES, type MealSlot } from "./constants";

/** Ograniczenia praktyczne z ustawień żywieniowych — twarde, nigdy nie są luzowane automatycznie. */
export interface PracticalLimits {
  maxPrepMinutes: number | null;
  difficulty: Difficulty;
  /** null = użytkownik nie podał wyposażenia (bez ograniczenia). */
  equipment: KitchenEquipment[] | null;
  maxIngredients: number | null;
  useLeftovers: boolean;
}

export const NO_PRACTICAL_LIMITS: PracticalLimits = {
  maxPrepMinutes: null,
  difficulty: "any",
  equipment: null,
  maxIngredients: null,
  useLeftovers: true,
};

export const PRACTICAL_REASONS = ["prep_time", "difficulty", "equipment", "max_ingredients"] as const;
export type PracticalReason = (typeof PRACTICAL_REASONS)[number];

export interface Candidate {
  recipe: Recipe;
  perServing: NutritionTotals;
  nutritionComplete: boolean;
  /** Zapotrzebowanie na JEDNĄ porcję (jednostka bazowa produktu). */
  needsPerServing: Need[];
  unconvertible: string[];
  groups: FoodGroup[];
  /** Preferowane produkty (etykiety użytkownika) obecne w przepisie. */
  preferredHits: string[];
  slots: MealSlot[];
}

export interface RejectedRecipe {
  recipe: Recipe;
  fit: RecipeFit;
  /** Ograniczenia praktyczne, których przepis nie spełnia (puste, gdy odrzucony tylko przez reguły). */
  practical: PracticalReason[];
}

export interface Screening {
  candidates: Candidate[];
  rejected: RejectedRecipe[];
}

export function practicalFailures(recipe: Recipe, limits: PracticalLimits): PracticalReason[] {
  const failures: PracticalReason[] = [];
  if (limits.maxPrepMinutes !== null && recipe.prepMinutes > limits.maxPrepMinutes) failures.push("prep_time");
  if (limits.difficulty === "easy" && recipe.difficulty !== "easy") failures.push("difficulty");
  if (limits.equipment !== null && recipe.equipment.some((e) => !limits.equipment!.includes(e))) failures.push("equipment");
  if (limits.maxIngredients !== null && recipe.ingredients.length > limits.maxIngredients) failures.push("max_ingredients");
  return failures;
}

export const slotsForRecipe = (recipe: Pick<Recipe, "mealTypes">): MealSlot[] =>
  MEAL_SLOTS.filter((slot) => SLOT_MEAL_TYPES[slot].some((type) => recipe.mealTypes.includes(type)));

/**
 * Kolejność ważności: 1–3 bezpieczeństwo, alergie i dieta (`evaluateRecipeFit`) — przepis
 * „wykluczony” albo „wymaga weryfikacji” nigdy nie trafia do planu automatycznie; potem
 * ograniczenia praktyczne (czas, trudność, wyposażenie, liczba składników).
 */
export function screenRecipes(
  recipes: readonly Recipe[],
  products: ProductIndex,
  rules: FoodRules,
  limits: PracticalLimits,
): Screening {
  const candidates: Candidate[] = [];
  const rejected: RejectedRecipe[] = [];
  const productList = [...products.values()];
  const preferredIds = new Map<string, string[]>();
  for (const label of rules.preferredProducts) {
    preferredIds.set(label, matchCatalogProducts(label, productList).map((p) => p.id));
  }

  for (const recipe of recipes) {
    const fit = evaluateRecipeFit(recipe, products, rules);
    const practical = practicalFailures(recipe, limits);
    if (fit.status !== "no_conflict_found" || practical.length > 0) {
      rejected.push({ recipe, fit, practical });
      continue;
    }
    const nutrition = calculateRecipeNutrition(recipe, products);
    const { needs, unconvertible } = recipeNeeds(recipe, products, 1 / recipe.servings);
    const ingredientIds = new Set(recipe.ingredients.map((i) => i.productId));
    candidates.push({
      recipe,
      perServing: nutrition.perServing,
      nutritionComplete: nutrition.complete,
      needsPerServing: needs,
      unconvertible,
      groups: recipeFoodGroups(recipe, products),
      preferredHits: [...preferredIds].filter(([, ids]) => ids.some((id) => ingredientIds.has(id))).map(([label]) => label),
      slots: slotsForRecipe(recipe),
    });
  }
  return { candidates, rejected };
}
