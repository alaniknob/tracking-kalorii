import { assessAllergens, type AllergenCode, type AllergenExclusion, type AllergenInfo, type ExclusionKind } from "@/features/allergens";
import { normalizeLabel } from "@/lib/text-list";
import { ALLERGEN_FOOD_GROUPS, DIET_STYLE_RULES, FOOD_GROUPS, type DietStyle, type FoodGroup } from "./diet-styles";

export interface DietRulesInput {
  dietStyles: DietStyle[];
  dislikedProducts: string[];
  preferredProducts: string[];
}

export interface RestrictionsInput {
  allergens: AllergenExclusion[];
  otherAllergies: string[];
  otherIntolerances: string[];
  voluntaryExclusions: string[];
}

export interface CustomExclusion {
  label: string;
  kind: ExclusionKind;
}

/**
 * `blocking` — sprzeczność w wyborach użytkownika; ustawienia nie zostaną przyjęte.
 * `resolved` — konflikt rozstrzygnięty automatycznie na korzyść ostrzejszej reguły (alergie > dieta > smak).
 */
export type PreferenceConflict =
  | { code: "diet_contradiction"; severity: "blocking"; group: FoodGroup; requiredBy: DietStyle; forbiddenBy: DietStyle }
  | {
      code: "restriction_overrides_diet";
      severity: "resolved";
      group: FoodGroup;
      requiredBy: DietStyle;
      allergen: AllergenCode;
      kind: "allergy" | "intolerance";
    }
  | { code: "product_preferred_and_disliked"; severity: "blocking"; product: string }
  | { code: "preferred_product_excluded"; severity: "resolved"; product: string; kind: ExclusionKind }
  | {
      code: "preferred_product_conflicts_rules";
      severity: "resolved";
      product: string;
      /** Nazwy pasujących produktów z katalogu — wszystkie wykluczone przez dietę lub alergeny. */
      matches: string[];
      reason: { kind: "group"; group: FoodGroup } | { kind: "allergen"; allergen: AllergenCode };
    };

/** Minimalny opis produktu z katalogu potrzebny do dopasowania preferencji (bez zależności od modułu produktów). */
export interface CatalogProductInfo {
  id: string;
  name: string;
  foodGroups: readonly FoodGroup[];
  allergens: AllergenInfo;
}

/** Produkty z katalogu pasujące do preferencji wpisanej tekstem (fragment nazwy, bez wielkości liter). */
export function matchCatalogProducts<P extends Pick<CatalogProductInfo, "name">>(label: string, products: readonly P[]): P[] {
  const key = normalizeLabel(label);
  if (key === "") return [];
  return products.filter((p) => normalizeLabel(p.name).includes(key));
}

export interface FoodRules {
  /** Grupy wykluczone (z diety lub alergii/nietolerancji). */
  forbiddenGroups: FoodGroup[];
  /** Grupy, które mają pojawiać się w planie (tylko te, które nie są wykluczone). */
  requiredGroups: FoodGroup[];
  allergens: AllergenExclusion[];
  customExclusions: CustomExclusion[];
  preferredProducts: string[];
  conflicts: PreferenceConflict[];
  hasBlockingConflict: boolean;
}

const sortGroups = (groups: Set<FoodGroup>) => FOOD_GROUPS.filter((group) => groups.has(group));

/**
 * Łączy sposoby żywienia, alergie, nietolerancje i wykluczenia w jeden zestaw reguł oraz
 * wykrywa konflikty. Kolejność ważności: alergie i nietolerancje > dieta > preferencje smakowe.
 * Wykluczenie zawsze wygrywa z wymaganiem — reguły nigdy nie są łagodzone.
 * Z katalogiem (`products`) wykrywa też preferowane produkty, których wszystkie odpowiedniki
 * w katalogu są wykluczone dietą lub alergenami (np. „jogurt” przy diecie wegańskiej).
 */
export function resolveFoodRules(
  diet: DietRulesInput | null,
  restrictions: RestrictionsInput | null,
  products: readonly CatalogProductInfo[] = [],
): FoodRules {
  const conflicts: PreferenceConflict[] = [];
  const dietStyles = diet?.dietStyles ?? [];

  const forbiddenByDiet = new Map<FoodGroup, DietStyle>();
  for (const style of dietStyles) {
    for (const group of DIET_STYLE_RULES[style].forbids) {
      if (!forbiddenByDiet.has(group)) forbiddenByDiet.set(group, style);
    }
  }

  const forbiddenByRestriction = new Map<FoodGroup, AllergenExclusion>();
  for (const exclusion of restrictions?.allergens ?? []) {
    const group = ALLERGEN_FOOD_GROUPS[exclusion.code];
    if (group && !forbiddenByRestriction.has(group)) forbiddenByRestriction.set(group, exclusion);
  }

  const required = new Set<FoodGroup>();
  for (const style of dietStyles) {
    for (const group of DIET_STYLE_RULES[style].requires) {
      const forbiddenBy = forbiddenByDiet.get(group);
      const restriction = forbiddenByRestriction.get(group);
      if (forbiddenBy) {
        conflicts.push({ code: "diet_contradiction", severity: "blocking", group, requiredBy: style, forbiddenBy });
      } else if (restriction) {
        conflicts.push({
          code: "restriction_overrides_diet",
          severity: "resolved",
          group,
          requiredBy: style,
          allergen: restriction.code,
          kind: restriction.kind,
        });
      } else {
        required.add(group);
      }
    }
  }

  const customExclusions: CustomExclusion[] = [
    ...(restrictions?.otherAllergies ?? []).map((label) => ({ label, kind: "allergy" as const })),
    ...(restrictions?.otherIntolerances ?? []).map((label) => ({ label, kind: "intolerance" as const })),
    ...(restrictions?.voluntaryExclusions ?? []).map((label) => ({ label, kind: "voluntary" as const })),
    ...(diet?.dislikedProducts ?? []).map((label) => ({ label, kind: "dislike" as const })),
  ];

  const exclusionKindByLabel = new Map<string, ExclusionKind>();
  for (const exclusion of customExclusions) {
    const key = normalizeLabel(exclusion.label);
    if (!exclusionKindByLabel.has(key)) exclusionKindByLabel.set(key, exclusion.kind);
  }

  const forbidden = new Set<FoodGroup>([...forbiddenByDiet.keys(), ...forbiddenByRestriction.keys()]);
  const allergens = restrictions?.allergens ?? [];

  const preferredProducts: string[] = [];
  for (const product of diet?.preferredProducts ?? []) {
    const kind = exclusionKindByLabel.get(normalizeLabel(product));
    if (kind === "dislike") {
      conflicts.push({ code: "product_preferred_and_disliked", severity: "blocking", product });
      continue;
    }
    if (kind) {
      conflicts.push({ code: "preferred_product_excluded", severity: "resolved", product, kind });
      continue;
    }
    const matches = matchCatalogProducts(product, products);
    const reasons = matches.map((p) => productExclusionReason(p, forbidden, allergens));
    if (matches.length > 0 && reasons.every((r) => r !== null)) {
      conflicts.push({
        code: "preferred_product_conflicts_rules",
        severity: "resolved",
        product,
        matches: matches.map((p) => p.name),
        reason: reasons[0]!,
      });
      continue;
    }
    preferredProducts.push(product);
  }

  return {
    forbiddenGroups: sortGroups(forbidden),
    requiredGroups: sortGroups(required),
    allergens,
    customExclusions,
    preferredProducts,
    conflicts,
    hasBlockingConflict: conflicts.some((conflict) => conflict.severity === "blocking"),
  };
}

/** Dlaczego produkt jest wykluczony przez dietę lub alergeny (null = nie jest). */
function productExclusionReason(
  product: CatalogProductInfo,
  forbidden: ReadonlySet<FoodGroup>,
  allergens: AllergenExclusion[],
): Extract<PreferenceConflict, { code: "preferred_product_conflicts_rules" }>["reason"] | null {
  const group = product.foodGroups.find((g) => forbidden.has(g));
  if (group) return { kind: "group", group };
  const assessment = assessAllergens(product.allergens, allergens);
  if (assessment.status === "excluded") return { kind: "allergen", allergen: assessment.matches[0].code };
  return null;
}
