import type { AllergenCode } from "@/features/allergens";

/** Grupy żywności, na których operują reguły sposobów żywienia. */
export const FOOD_GROUPS = ["meat", "fish", "seafood", "eggs", "dairy", "honey"] as const;
export type FoodGroup = (typeof FOOD_GROUPS)[number];

export const DIET_STYLES = [
  "traditional",
  "vegetarian",
  "vegan",
  "meatless",
  "with_fish",
  "no_fish",
  "with_meat",
] as const;
export type DietStyle = (typeof DIET_STYLES)[number];

/**
 * Sposoby żywienia jako reguły (nie wzajemnie wykluczające się etykiety). Dodanie nowego
 * sposobu = nowy wpis tutaj + tekst w i18n. `requires` oznacza, że grupa ma pojawiać się w planie.
 */
export const DIET_STYLE_RULES: Record<DietStyle, { forbids: FoodGroup[]; requires: FoodGroup[] }> = {
  traditional: { forbids: [], requires: [] },
  vegetarian: { forbids: ["meat", "fish", "seafood"], requires: [] },
  vegan: { forbids: ["meat", "fish", "seafood", "eggs", "dairy", "honey"], requires: [] },
  meatless: { forbids: ["meat"], requires: [] },
  with_fish: { forbids: [], requires: ["fish"] },
  no_fish: { forbids: ["fish", "seafood"], requires: [] },
  with_meat: { forbids: [], requires: ["meat"] },
};

/** Alergeny UE, których wykluczenie wyklucza całą grupę żywności. */
export const ALLERGEN_FOOD_GROUPS: Partial<Record<AllergenCode, FoodGroup>> = {
  fish: "fish",
  crustaceans: "seafood",
  molluscs: "seafood",
  eggs: "eggs",
  milk: "dairy",
};

export const KITCHEN_EQUIPMENT = ["stove", "oven", "microwave", "blender", "air_fryer", "slow_cooker"] as const;
export type KitchenEquipment = (typeof KITCHEN_EQUIPMENT)[number];

export const DIFFICULTY_LEVELS = ["easy", "medium", "any"] as const;
export type Difficulty = (typeof DIFFICULTY_LEVELS)[number];

export const PREP_TIME_OPTIONS = ["15", "30", "45", "60", "90", "none"] as const;

export const PREFERENCE_LIMITS = {
  textListMaxItems: 30,
  textItemLength: { min: 2, max: 60 },
  textFieldMaxLength: 2000,
  maxIngredients: { min: 3, max: 20 },
} as const;
