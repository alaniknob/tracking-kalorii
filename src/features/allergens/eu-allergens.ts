/**
 * 14 alergenów wymagających oznaczania w UE — rozporządzenie (UE) nr 1169/2011, załącznik II.
 * Kolejność zgodna z załącznikiem.
 */
export const EU_ALLERGENS = [
  "gluten",
  "crustaceans",
  "eggs",
  "fish",
  "peanuts",
  "soybeans",
  "milk",
  "nuts",
  "celery",
  "mustard",
  "sesame",
  "sulphites",
  "lupin",
  "molluscs",
] as const;

export type AllergenCode = (typeof EU_ALLERGENS)[number];

/** Rodzaje ograniczeń — celowo rozróżniane, bo mają różne konsekwencje (np. śladowe ilości). */
export const EXCLUSION_KINDS = ["allergy", "intolerance", "voluntary", "dislike"] as const;
export type ExclusionKind = (typeof EXCLUSION_KINDS)[number];

/** Reakcja użytkownika na alergen z listy UE. */
export const ALLERGEN_REACTIONS = ["none", "allergy", "intolerance"] as const;
export type AllergenReaction = (typeof ALLERGEN_REACTIONS)[number];

export interface AllergenExclusion {
  code: AllergenCode;
  kind: "allergy" | "intolerance";
  /** Czy wykluczać produkty z deklaracją „może zawierać” (zanieczyszczenie krzyżowe). */
  excludeTraces: boolean;
}
