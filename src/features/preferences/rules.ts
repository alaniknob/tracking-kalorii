import type { AllergenCode, AllergenExclusion, ExclusionKind } from "@/features/allergens";
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
  | { code: "preferred_product_excluded"; severity: "resolved"; product: string; kind: ExclusionKind };

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
 */
export function resolveFoodRules(diet: DietRulesInput | null, restrictions: RestrictionsInput | null): FoodRules {
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

  const preferredProducts: string[] = [];
  for (const product of diet?.preferredProducts ?? []) {
    const kind = exclusionKindByLabel.get(normalizeLabel(product));
    if (kind === "dislike") {
      conflicts.push({ code: "product_preferred_and_disliked", severity: "blocking", product });
    } else if (kind) {
      conflicts.push({ code: "preferred_product_excluded", severity: "resolved", product, kind });
    } else {
      preferredProducts.push(product);
    }
  }

  const forbidden = new Set<FoodGroup>([...forbiddenByDiet.keys(), ...forbiddenByRestriction.keys()]);

  return {
    forbiddenGroups: sortGroups(forbidden),
    requiredGroups: sortGroups(required),
    allergens: restrictions?.allergens ?? [],
    customExclusions,
    preferredProducts,
    conflicts,
    hasBlockingConflict: conflicts.some((conflict) => conflict.severity === "blocking"),
  };
}
