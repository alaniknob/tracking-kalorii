import { toBaseAmount, toGrams, type ConversionError } from "@/features/products/quantity";
import type { Product } from "@/features/products/types";
import type { Recipe } from "./types";

export type ProductIndex = ReadonlyMap<string, Product>;

export type RecipeDataIssue =
  | { code: "unknown_product"; productId: string }
  | { code: "conversion_failed"; productId: string; error: ConversionError }
  | { code: "missing_nutrition"; productId: string }
  | { code: "missing_fiber"; productId: string };

export interface NutritionTotals {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbohydratesG: number;
  /** Suma błonnika z produktów, które go podają; patrz `fiberComplete`. */
  fiberG: number;
}

export interface RecipeNutrition {
  total: NutritionTotals;
  perServing: NutritionTotals;
  /** Wartości na 100 g gotowej potrawy — tylko gdy znana masa po przygotowaniu. */
  per100gCooked: NutritionTotals | null;
  /** Masa surowych składników (g); null, gdy któregoś nie da się przeliczyć na gramy. */
  rawMassG: number | null;
  cookedYieldG: number | null;
  /** Masa porcji: z masy po przygotowaniu, a gdy nieznana — z masy surowej. */
  servingMassG: number | null;
  /** false = brakuje danych któregoś składnika; wartości są wtedy zaniżone (dolna granica). */
  complete: boolean;
  fiberComplete: boolean;
  issues: RecipeDataIssue[];
}

const zero = (): NutritionTotals => ({ kcal: 0, proteinG: 0, fatG: 0, carbohydratesG: 0, fiberG: 0 });

function scale(t: NutritionTotals, factor: number): NutritionTotals {
  const r1 = (n: number) => Math.round(n * factor * 10) / 10;
  return {
    kcal: Math.round(t.kcal * factor),
    proteinG: r1(t.proteinG),
    fatG: r1(t.fatG),
    carbohydratesG: r1(t.carbohydratesG),
    fiberG: r1(t.fiberG),
  };
}

/**
 * Kalorie i makro przepisu liczone ze składników (ilości surowe × wartości na 100 g/ml).
 * Obróbka zmienia masę (woda), ale nie energię składników — dlatego energię liczymy z masy
 * surowej, a masę gotowej potrawy (`cookedYieldG`) używamy tylko do wartości na 100 g i porcji.
 */
export function calculateRecipeNutrition(recipe: Recipe, products: ProductIndex): RecipeNutrition {
  const total = zero();
  const issues: RecipeDataIssue[] = [];
  let rawMassG: number | null = 0;

  for (const ingredient of recipe.ingredients) {
    const product = products.get(ingredient.productId);
    if (!product) {
      issues.push({ code: "unknown_product", productId: ingredient.productId });
      rawMassG = null;
      continue;
    }
    const grams = toGrams(ingredient.amount, ingredient.unit, product);
    if (grams.ok && rawMassG !== null) rawMassG += grams.value;
    else if (!grams.ok) rawMassG = null;

    if (product.nutrition === null) {
      issues.push({ code: "missing_nutrition", productId: product.id });
      continue;
    }
    const base = toBaseAmount(ingredient.amount, ingredient.unit, product);
    if (!base.ok) {
      issues.push({ code: "conversion_failed", productId: product.id, error: base.error });
      continue;
    }
    const f = base.value / 100;
    const n = product.nutrition;
    total.kcal += n.kcal * f;
    total.proteinG += n.proteinG * f;
    total.fatG += n.fatG * f;
    total.carbohydratesG += n.carbohydratesG * f;
    if (n.fiberG === null) issues.push({ code: "missing_fiber", productId: product.id });
    else total.fiberG += n.fiberG * f;
  }

  const cookedYieldG = recipe.cookedYieldG;
  const massForServing = cookedYieldG ?? rawMassG;
  return {
    total: scale(total, 1),
    perServing: scale(total, 1 / recipe.servings),
    per100gCooked: cookedYieldG ? scale(total, 100 / cookedYieldG) : null,
    rawMassG: rawMassG === null ? null : Math.round(rawMassG),
    cookedYieldG,
    servingMassG: massForServing === null ? null : Math.round(massForServing / recipe.servings),
    complete: !issues.some((issue) => issue.code !== "missing_fiber"),
    fiberComplete: !issues.some((issue) => issue.code === "missing_fiber"),
    issues,
  };
}
