import type { MealType } from "@/features/recipes/types";

/**
 * Wszystkie współczynniki generatora w jednym miejscu (uzasadnienia: docs/DECISIONS.md, D31–D37).
 * Zmiana wartości = zmiana zachowania generatora; testy w `planner.test.ts`.
 */

export const PLAN_DAYS = 7;

export const MEAL_SLOTS = ["breakfast", "second_breakfast", "lunch", "afternoon_snack", "dinner", "evening_snack"] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

/** Jakie przepisy (typ posiłku w katalogu) pasują do miejsca w dniu. */
export const SLOT_MEAL_TYPES: Record<MealSlot, MealType[]> = {
  breakfast: ["breakfast"],
  second_breakfast: ["snack"],
  lunch: ["lunch"],
  afternoon_snack: ["snack"],
  dinner: ["dinner"],
  evening_snack: ["snack"],
};

/**
 * Układ dnia dla liczby posiłków (2–6, jak w profilu) i udział każdego posiłku w dziennej energii.
 * Udziały służą tylko do wstępnego doboru porcji — ocenia się energię całego dnia.
 */
export const DAY_LAYOUTS: Record<number, { slot: MealSlot; share: number }[]> = {
  2: [
    { slot: "breakfast", share: 0.4 },
    { slot: "lunch", share: 0.6 },
  ],
  3: [
    { slot: "breakfast", share: 0.3 },
    { slot: "lunch", share: 0.4 },
    { slot: "dinner", share: 0.3 },
  ],
  4: [
    { slot: "breakfast", share: 0.25 },
    { slot: "second_breakfast", share: 0.1 },
    { slot: "lunch", share: 0.35 },
    { slot: "dinner", share: 0.3 },
  ],
  5: [
    { slot: "breakfast", share: 0.25 },
    { slot: "second_breakfast", share: 0.1 },
    { slot: "lunch", share: 0.3 },
    { slot: "afternoon_snack", share: 0.1 },
    { slot: "dinner", share: 0.25 },
  ],
  6: [
    { slot: "breakfast", share: 0.2 },
    { slot: "second_breakfast", share: 0.1 },
    { slot: "lunch", share: 0.3 },
    { slot: "afternoon_snack", share: 0.1 },
    { slot: "dinner", share: 0.2 },
    { slot: "evening_snack", share: 0.1 },
  ],
};

/** Wielkość porcji jako wielokrotność jednej porcji przepisu (gramatury skalowane proporcjonalnie). */
export const PORTION_FACTORS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

/** Dzienna energia planu mieści się w celu, gdy odchylenie ≤ 10%. */
export const KCAL_TOLERANCE = 0.1;

/** Dopuszczalne pasma makroskładników względem celu dziennego (ułamek celu). */
export const MACRO_BANDS = {
  protein: { min: 0.85, max: 1.4 },
  fat: { min: 0.7, max: 1.3 },
  carbohydrates: { min: 0.7, max: 1.3 },
} as const;

/** Grupa wymagana przez dietę (np. „Z rybami”) ma pojawić się co najmniej tyle razy w tygodniu. */
export const REQUIRED_GROUP_MIN_PER_WEEK = 1;

/** Ten sam przepis gotowany częściej niż tyle razy w tygodniu obniża ocenę (resztki się nie liczą). */
export const MAX_SAME_RECIPE_PER_WEEK = 2;

/** Posiłki, które mogą być resztkami z poprzedniego dnia (gotowanie na dwa dni). */
export const LEFTOVER_SLOTS: readonly MealSlot[] = ["lunch", "dinner"];

/**
 * Wagi celów miękkich (po spełnieniu twardych ograniczeń i progów energii, makro i budżetu).
 * Jednostka: „punkty” ≈ grosze — 1 zł kosztu = 100 pkt.
 */
export const SOFT_WEIGHTS = {
  /** koszt koszyka (opakowania do kupienia), za grosz */
  costGrosz: 1,
  /** wartość niezużytych części opakowań, za grosz (dodatkowo do kosztu) */
  wasteGrosz: 0.5,
  /** odchylenie od celu kcal w obrębie tolerancji, za kcal dziennie */
  kcalDeviation: 2,
  /** odchylenie białka od celu, za gram dziennie */
  proteinDeviationG: 5,
  /** czas przygotowania, za minutę */
  prepMinute: 4,
  /** każde ugotowanie przepisu ponad limit w tygodniu */
  recipeRepeat: 1500,
  /** ten sam przepis dwa razy jednego dnia */
  sameDayRepeat: 4000,
  /** posiłek z preferowanym produktem (nagroda) */
  preferredMeal: 300,
  /** posiłek z niepełnymi danymi odżywczymi */
  incompleteNutrition: 200,
} as const;

/** Ograniczenie czasu obliczeń — liczba pełnych przejść optymalizacji lokalnej. */
export const MAX_SEARCH_PASSES = 12;

export const PANTRY_LIMITS = { maxItems: 30, maxAmount: 100_000 } as const;

/** Start planu: od dziś do 14 dni naprzód; plan starszy niż 60 dni nie jest odtwarzany. */
export const PLAN_START_LIMITS = { maxDaysAhead: 14, maxAgeDays: 60 } as const;
