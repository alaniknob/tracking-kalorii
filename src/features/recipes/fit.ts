import {
  assessAllergens,
  type AllergenCode,
  type AllergenDeclaration,
  type AllergenInfo,
  type ExclusionKind,
} from "@/features/allergens";
import { FOOD_GROUPS, type FoodGroup } from "@/features/preferences/diet-styles";
import type { FoodRules } from "@/features/preferences/rules";
import { normalizeLabel } from "@/lib/text-list";
import type { ProductIndex } from "./nutrition";
import type { Recipe } from "./types";

/** Alergeny przepisu = suma alergenów składników („zawiera” ma pierwszeństwo przed „może zawierać”). */
export function aggregateRecipeAllergens(recipe: Recipe, products: ProductIndex): AllergenInfo {
  const declared: Partial<Record<AllergenCode, AllergenDeclaration>> = {};
  let ingredientsKnown = true;
  for (const ingredient of recipe.ingredients) {
    const product = products.get(ingredient.productId);
    if (!product) {
      ingredientsKnown = false;
      continue;
    }
    if (!product.allergens.ingredientsKnown) ingredientsKnown = false;
    for (const [code, declaration] of Object.entries(product.allergens.declared) as [AllergenCode, AllergenDeclaration][]) {
      if (declared[code] !== "contains") declared[code] = declaration;
    }
  }
  return { ingredientsKnown, declared };
}

export function recipeFoodGroups(recipe: Recipe, products: ProductIndex): FoodGroup[] {
  const groups = new Set<FoodGroup>();
  for (const ingredient of recipe.ingredients) {
    for (const group of products.get(ingredient.productId)?.foodGroups ?? []) groups.add(group);
  }
  return FOOD_GROUPS.filter((group) => groups.has(group));
}

export type RecipeFitReason =
  | { code: "allergen"; allergen: AllergenCode; declaration: AllergenDeclaration }
  | { code: "forbidden_group"; group: FoodGroup }
  | { code: "custom_exclusion"; label: string; kind: ExclusionKind; productName: string }
  | { code: "allergen_data_incomplete" }
  | { code: "allergen_traces" }
  | { code: "custom_restriction_unverifiable"; label: string; kind: "allergy" | "intolerance" };

/**
 * `no_conflict_found` świadomie nie znaczy „bezpieczny” — tylko, że dostępne dane nie wskazują konfliktu.
 */
export type RecipeFitStatus = "excluded" | "needs_verification" | "no_conflict_found";

export interface RecipeFit {
  status: RecipeFitStatus;
  reasons: RecipeFitReason[];
}

/**
 * Ocena przepisu względem reguł użytkownika. Kolejność: wykluczenia (alergeny, grupy, własne)
 * → brak danych do potwierdzenia → brak konfliktu. Żadna preferencja nie łagodzi wykluczenia.
 */
export function evaluateRecipeFit(recipe: Recipe, products: ProductIndex, rules: FoodRules): RecipeFit {
  const excluded: RecipeFitReason[] = [];
  const verify: RecipeFitReason[] = [];

  const allergenInfo = aggregateRecipeAllergens(recipe, products);
  const assessment = assessAllergens(allergenInfo, rules.allergens);
  if (assessment.status === "excluded") {
    for (const match of assessment.matches) {
      excluded.push({ code: "allergen", allergen: match.code, declaration: match.declaration });
    }
  } else if (assessment.status === "needs_verification") {
    for (const reason of assessment.reasons) {
      verify.push({ code: reason === "missing_ingredients" ? "allergen_data_incomplete" : "allergen_traces" });
    }
  }

  const groups = new Set(recipeFoodGroups(recipe, products));
  for (const group of rules.forbiddenGroups) {
    if (groups.has(group)) excluded.push({ code: "forbidden_group", group });
  }

  const ingredientProducts = recipe.ingredients.map((i) => products.get(i.productId));
  const anyUnknownIngredients = ingredientProducts.some((p) => !p || !p.allergens.ingredientsKnown);
  for (const exclusion of rules.customExclusions) {
    const label = normalizeLabel(exclusion.label);
    const checksIngredients = exclusion.kind === "allergy" || exclusion.kind === "intolerance";
    const match = ingredientProducts.find(
      (p) =>
        p &&
        (normalizeLabel(p.name).includes(label) ||
          (checksIngredients && p.ingredientsText !== null && normalizeLabel(p.ingredientsText).includes(label))),
    );
    if (match) {
      excluded.push({ code: "custom_exclusion", label: exclusion.label, kind: exclusion.kind, productName: match.name });
    } else if (checksIngredients && anyUnknownIngredients) {
      verify.push({
        code: "custom_restriction_unverifiable",
        label: exclusion.label,
        kind: exclusion.kind as "allergy" | "intolerance",
      });
    }
  }

  if (excluded.length > 0) return { status: "excluded", reasons: excluded };
  if (verify.length > 0) return { status: "needs_verification", reasons: verify };
  return { status: "no_conflict_found", reasons: [] };
}
