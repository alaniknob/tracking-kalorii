import type { DataSource } from "@/features/products/types";
import type { Recipe } from "./types";

/**
 * PRZEPISY PRZYKŁADOWE (DEMO). Kalorie i makro nie są tu wpisane — liczone ze składników.
 * Masy po przygotowaniu (`cookedYieldG`) są szacunkowe.
 */
export const DEMO_RECIPE_SOURCE: DataSource = {
  name: "Przepis przykładowy (demo) — nieprzetestowany, masa po przygotowaniu szacunkowa",
  url: null,
  isDemo: true,
};

const base = { source: DEMO_RECIPE_SOURCE, reliability: "unverified" as const };

export const DEMO_RECIPES: Recipe[] = [
  {
    ...base,
    id: "owsianka-bananowa",
    name: "Owsianka bananowa z masłem orzechowym",
    description: "Szybkie śniadanie na mleku z bananem.",
    mealTypes: ["breakfast"],
    servings: 1,
    prepMinutes: 10,
    difficulty: "easy",
    equipment: ["stove"],
    ingredients: [
      { productId: "platki-owsiane", amount: 50, unit: "g", note: null },
      { productId: "mleko-2", amount: 250, unit: "ml", note: null },
      { productId: "banan", amount: 1, unit: "szt", note: "pokrojony w plasterki" },
      { productId: "maslo-orzechowe", amount: 15, unit: "g", note: null },
    ],
    instructions: [
      "Zagotuj mleko w małym garnku.",
      "Wsyp płatki i gotuj na małym ogniu 3–4 minuty, mieszając.",
      "Przełóż do miski, dodaj banana i masło orzechowe.",
    ],
    cookedYieldG: 400,
  },
  {
    ...base,
    id: "jajecznica-z-papryka",
    name: "Jajecznica z papryką i chlebem żytnim",
    description: "Jajecznica na oleju z papryką i cebulą, podana z pieczywem.",
    mealTypes: ["breakfast", "dinner"],
    servings: 1,
    prepMinutes: 10,
    difficulty: "easy",
    equipment: ["stove"],
    ingredients: [
      { productId: "jaja", amount: 3, unit: "szt", note: null },
      { productId: "papryka-czerwona", amount: 0.5, unit: "szt", note: "w kostkę" },
      { productId: "cebula", amount: 0.25, unit: "szt", note: "posiekana" },
      { productId: "olej-rzepakowy", amount: 5, unit: "ml", note: null },
      { productId: "chleb-zytni", amount: 60, unit: "g", note: "2 kromki" },
    ],
    instructions: [
      "Na rozgrzanym oleju podsmaż cebulę i paprykę przez 3 minuty.",
      "Wbij jaja i smaż, delikatnie mieszając, do ścięcia.",
      "Podawaj z chlebem.",
    ],
    cookedYieldG: null,
  },
  {
    ...base,
    id: "kurczak-curry-z-ryzem",
    name: "Kurczak curry z papryką i ryżem",
    description: "Obiad na dwie porcje — kurczak duszony z warzywami i przyprawą curry.",
    mealTypes: ["lunch", "dinner"],
    servings: 2,
    prepMinutes: 30,
    difficulty: "easy",
    equipment: ["stove"],
    ingredients: [
      { productId: "piers-kurczaka", amount: 300, unit: "g", note: "w kostkę" },
      { productId: "ryz-bialy", amount: 150, unit: "g", note: "suchy" },
      { productId: "papryka-czerwona", amount: 1, unit: "szt", note: null },
      { productId: "cebula", amount: 1, unit: "szt", note: null },
      { productId: "olej-rzepakowy", amount: 10, unit: "ml", note: null },
      { productId: "przyprawa-curry", amount: 5, unit: "g", note: null },
    ],
    instructions: [
      "Ugotuj ryż zgodnie z instrukcją na opakowaniu.",
      "Na oleju podsmaż cebulę, dodaj kurczaka i smaż 5–6 minut.",
      "Dodaj paprykę i curry, podlej odrobiną wody i duś 10 minut.",
      "Podawaj z ryżem.",
    ],
    cookedYieldG: 900,
  },
  {
    ...base,
    id: "makaron-z-ciecierzyca",
    name: "Makaron pełnoziarnisty z ciecierzycą w sosie pomidorowym",
    description: "Roślinny obiad na dwie porcje.",
    mealTypes: ["lunch", "dinner"],
    servings: 2,
    prepMinutes: 25,
    difficulty: "easy",
    equipment: ["stove"],
    ingredients: [
      { productId: "makaron-pelnoziarnisty", amount: 160, unit: "g", note: "suchy" },
      { productId: "ciecierzyca-konserwowa", amount: 240, unit: "g", note: "odsączona" },
      { productId: "pomidory-krojone", amount: 400, unit: "g", note: null },
      { productId: "cebula", amount: 1, unit: "szt", note: null },
      { productId: "olej-rzepakowy", amount: 10, unit: "ml", note: null },
    ],
    instructions: [
      "Ugotuj makaron al dente.",
      "Na oleju zeszklij cebulę, dodaj pomidory i ciecierzycę, gotuj 10 minut.",
      "Wymieszaj sos z makaronem.",
    ],
    cookedYieldG: 950,
  },
  {
    ...base,
    id: "losos-pieczony-z-ryzem",
    name: "Pieczony łosoś z ryżem i papryką",
    description: "Łosoś pieczony w piekarniku, na dwie porcje.",
    mealTypes: ["lunch", "dinner"],
    servings: 2,
    prepMinutes: 35,
    difficulty: "medium",
    equipment: ["oven", "stove"],
    ingredients: [
      { productId: "losos", amount: 250, unit: "g", note: null },
      { productId: "ryz-bialy", amount: 120, unit: "g", note: "suchy" },
      { productId: "papryka-czerwona", amount: 1, unit: "szt", note: "w paski" },
      { productId: "olej-rzepakowy", amount: 5, unit: "ml", note: null },
    ],
    instructions: [
      "Rozgrzej piekarnik do 200°C.",
      "Ułóż łosoś i paprykę na blasze, skrop olejem, piecz 15–18 minut.",
      "W tym czasie ugotuj ryż.",
    ],
    cookedYieldG: 720,
  },
  {
    ...base,
    id: "tofu-z-warzywami",
    name: "Tofu smażone z warzywami i ryżem",
    description: "Wegański obiad na dwie porcje.",
    mealTypes: ["lunch", "dinner"],
    servings: 2,
    prepMinutes: 25,
    difficulty: "easy",
    equipment: ["stove"],
    ingredients: [
      { productId: "tofu-naturalne", amount: 180, unit: "g", note: "w kostkę" },
      { productId: "ryz-bialy", amount: 100, unit: "g", note: "suchy" },
      { productId: "papryka-czerwona", amount: 1, unit: "szt", note: null },
      { productId: "cebula", amount: 1, unit: "szt", note: null },
      { productId: "olej-rzepakowy", amount: 10, unit: "ml", note: null },
    ],
    instructions: [
      "Ugotuj ryż.",
      "Tofu osusz i smaż na oleju na złoto.",
      "Dodaj pokrojone warzywa i smaż jeszcze 5 minut. Podawaj z ryżem.",
    ],
    cookedYieldG: 650,
  },
];
