import { DEMO_PRODUCTS } from "@/features/products/demo-products";
import { createInMemoryCatalog } from "@/features/products/provider";
import { DEMO_RECIPES } from "./demo-recipes";

/** Aktywne źródło katalogu. Do czasu podłączenia Supabase — wyłącznie dane przykładowe. */
export const catalog = createInMemoryCatalog(DEMO_PRODUCTS, DEMO_RECIPES, true);

export function recipeProductIds(recipes: readonly { ingredients: readonly { productId: string }[] }[]): string[] {
  return [...new Set(recipes.flatMap((r) => r.ingredients.map((i) => i.productId)))];
}
