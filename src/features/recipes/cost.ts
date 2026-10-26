import type { Need } from "@/features/pricing/cost";
import { toBaseAmount } from "@/features/products/quantity";
import type { ProductIndex } from "./nutrition";
import type { Recipe } from "./types";

/**
 * Zapotrzebowanie na produkty dla przepisu przygotowanego `times` razy (całe przepisy,
 * ilości surowe). Składniki, których ilości nie da się przeliczyć, są zwracane osobno.
 */
export function recipeNeeds(recipe: Recipe, products: ProductIndex, times = 1): { needs: Need[]; unconvertible: string[] } {
  const needs: Need[] = [];
  const unconvertible: string[] = [];
  for (const ingredient of recipe.ingredients) {
    const product = products.get(ingredient.productId);
    const base = product ? toBaseAmount(ingredient.amount, ingredient.unit, product) : null;
    if (!base?.ok) {
      unconvertible.push(ingredient.productId);
      continue;
    }
    needs.push({ productId: ingredient.productId, baseAmount: base.value * times });
  }
  return { needs, unconvertible };
}
