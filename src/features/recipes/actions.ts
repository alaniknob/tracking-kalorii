"use server";

import { resolveRulesFromDrafts } from "@/features/preferences/evaluate";
import { catalog, recipeProductIds } from "./catalog";
import { evaluateRecipeFit, type RecipeFit } from "./fit";

export interface RecipeFitResponse {
  hasSettings: boolean;
  fits: Record<string, RecipeFit>;
}

const MAX_IDS = 200;

/** Ocena przepisów względem ustawień użytkownika z bieżącej karty. Nic nie jest zapisywane. */
export async function evaluateRecipeFitAction(
  recipeIds: string[],
  dietDraft: string,
  restrictionsDraft: string,
): Promise<RecipeFitResponse> {
  const { hasSettings, rules } = resolveRulesFromDrafts(
    typeof dietDraft === "string" ? dietDraft : "",
    typeof restrictionsDraft === "string" ? restrictionsDraft : "",
  );
  const wanted = new Set(Array.isArray(recipeIds) ? recipeIds.filter((id) => typeof id === "string").slice(0, MAX_IDS) : []);
  const recipes = (await catalog.listRecipes()).filter((r) => wanted.has(r.id));
  const products = await catalog.getProducts(recipeProductIds(recipes));
  const fits: Record<string, RecipeFit> = {};
  for (const recipe of recipes) fits[recipe.id] = evaluateRecipeFit(recipe, products, rules);
  return { hasSettings, fits };
}
