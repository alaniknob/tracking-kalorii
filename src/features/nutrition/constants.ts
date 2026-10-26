/**
 * WSZYSTKIE współczynniki obliczeń energii i makroskładników.
 * Zmiana wartości wymaga aktualizacji testów (constants.test.ts, energy.test.ts)
 * oraz docs/DECISIONS.md. Wyniki są szacunkiem, nie pomiarem medycznym.
 */
import type { ActivityLevel, Goal, Sex } from "./types";

/**
 * Mifflin MD, St Jeor ST i in., „A new predictive equation for resting energy expenditure
 * in healthy individuals”, Am J Clin Nutr 1990;51(2):241–247.
 * BMR [kcal/d] = 10 × masa[kg] + 6,25 × wzrost[cm] − 5 × wiek[lata] + s,
 * gdzie s = +5 (mężczyźni), −161 (kobiety).
 * Dla płci nieokreślonej przyjmujemy średnią obu stałych (−78) i oznaczamy wynik jako mniej dokładny.
 */
export const MIFFLIN_ST_JEOR = {
  weightCoefficient: 10,
  heightCoefficient: 6.25,
  ageCoefficient: 5,
  sexConstant: { male: 5, female: -161, unspecified: -78 } satisfies Record<Sex, number>,
  /** Zakres wieku populacji badanej w oryginalnej pracy. */
  studiedAgeRange: { min: 19, max: 78 },
} as const;

/** Współczynniki aktywności fizycznej (PAL) do wyliczenia TDEE = BMR × PAL. */
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/**
 * Korekta TDEE zależna od celu: ułamek TDEE, ale nie więcej niż `maxAbsKcal` dziennie.
 * Deficyt 500 kcal/d ≈ 0,5 kg/tydz. — górna granica bezpiecznego tempa redukcji w aplikacji.
 */
export const GOAL_ADJUSTMENTS: Record<Goal, { fraction: number; maxAbsKcal: number }> = {
  lose_weight: { fraction: -0.15, maxAbsKcal: 500 },
  maintain: { fraction: 0, maxAbsKcal: 0 },
  gain_weight: { fraction: 0.1, maxAbsKcal: 400 },
  build_muscle: { fraction: 0.05, maxAbsKcal: 250 },
};

/** Bezwzględne minimum proponowanej kaloryczności (kcal/d) — aplikacja nigdy nie zaproponuje mniej. */
export const MIN_DAILY_KCAL: Record<Sex, number> = {
  female: 1200,
  male: 1500,
  unspecified: 1500,
};

/** Białko w g na kg (referencyjnej) masy ciała, zależnie od celu. */
export const PROTEIN_G_PER_KG: Record<Goal, number> = {
  lose_weight: 1.6,
  maintain: 1.2,
  gain_weight: 1.4,
  build_muscle: 1.8,
};

/** Maksymalny udział energii z białka — chroni przed nadmiarem przy niskiej kaloryczności. */
export const PROTEIN_MAX_ENERGY_SHARE = 0.35;

/** Udział energii z tłuszczu (zalecany zakres 20–35%; przyjmujemy 30%). */
export const FAT_ENERGY_SHARE = 0.3;

/** Błonnik: 14 g na 1000 kcal (Institute of Medicine, DRI 2005). */
export const FIBER_G_PER_1000_KCAL = 14;

/** Wartości energetyczne makroskładników (współczynniki Atwatera). */
export const KCAL_PER_GRAM = { protein: 4, carbohydrates: 4, fat: 9 } as const;

/** Progi BMI (WHO). */
export const BMI_THRESHOLDS = {
  underweight: 18.5,
  obesity: 30,
  /** Przy BMI ≥ obesity białko liczone jest od masy odpowiadającej temu BMI. */
  proteinReference: 25,
} as const;

export const ADULT_AGE_YEARS = 18;

/** Zaokrąglenie proponowanej kaloryczności — nie sugerujemy fałszywej precyzji. */
export const KCAL_ROUNDING_STEP = 10;

/** Twarde granice wejścia; wartości poza nimi dają błędne lub niebezpieczne wyniki. */
export const INPUT_LIMITS = {
  ageYears: { min: 10, max: 100 },
  heightCm: { min: 120, max: 230 },
  weightKg: { min: 35, max: 300 },
  mealsPerDay: { min: 2, max: 6 },
} as const;
