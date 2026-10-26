import type { DataSource, Product } from "./types";

/**
 * DANE PRZYKŁADOWE (DEMO). Przybliżone wartości typowe dla kategorii produktu, zaokrąglone —
 * NIE pochodzą z etykiety konkretnego produktu ani marki. Służą wyłącznie do demonstracji
 * obliczeń. W UI zawsze oznaczane jako przykładowe. Brak cen (ceny: etap 4).
 */
export const DEMO_SOURCE: DataSource = {
  name: "Dane przykładowe (demo) — przybliżone wartości typowe, nie z etykiety konkretnego produktu",
  url: null,
  isDemo: true,
};

const UPDATED = "2026-10-26";

type DemoInput = Omit<Product, "source" | "updatedAt" | "brand" | "densityGPerMl" | "gramsPerPiece"> &
  Partial<Pick<Product, "densityGPerMl" | "gramsPerPiece">>;

const demo = (p: DemoInput): Product => ({
  brand: null,
  densityGPerMl: null,
  gramsPerPiece: null,
  ...p,
  source: DEMO_SOURCE,
  updatedAt: UPDATED,
});

const known = (ingredientsText: string, declared: Product["allergens"]["declared"] = {}) => ({
  ingredientsText,
  allergens: { ingredientsKnown: true, declared },
});

export const DEMO_PRODUCTS: Product[] = [
  demo({
    id: "platki-owsiane",
    name: "Płatki owsiane górskie",
    category: "grains",
    baseUnit: "g",
    packageSize: 500,
    nutrition: { kcal: 372, proteinG: 13.5, fatG: 7, carbohydratesG: 58.7, fiberG: 10 },
    ...known("płatki owsiane", { gluten: "contains" }),
    foodGroups: [],
  }),
  demo({
    id: "mleko-2",
    name: "Mleko 2% tłuszczu",
    category: "dairy",
    baseUnit: "ml",
    packageSize: 1000,
    densityGPerMl: 1.03,
    nutrition: { kcal: 50, proteinG: 3.3, fatG: 2, carbohydratesG: 4.8, fiberG: 0 },
    ...known("mleko", { milk: "contains" }),
    foodGroups: ["dairy"],
  }),
  demo({
    id: "jogurt-naturalny",
    name: "Jogurt naturalny",
    category: "dairy",
    baseUnit: "g",
    packageSize: 400,
    nutrition: { kcal: 61, proteinG: 4.3, fatG: 2.5, carbohydratesG: 5.3, fiberG: 0 },
    ...known("mleko, żywe kultury bakterii", { milk: "contains" }),
    foodGroups: ["dairy"],
  }),
  demo({
    id: "jaja",
    name: "Jaja kurze, rozmiar M",
    category: "eggs",
    baseUnit: "g",
    packageSize: 500,
    // masa części jadalnej jednego jajka M (bez skorupki)
    gramsPerPiece: 50,
    nutrition: { kcal: 140, proteinG: 12.5, fatG: 9.7, carbohydratesG: 0.7, fiberG: 0 },
    ...known("jaja kurze", { eggs: "contains" }),
    foodGroups: ["eggs"],
  }),
  demo({
    id: "piers-kurczaka",
    name: "Filet z piersi kurczaka",
    category: "meat",
    baseUnit: "g",
    packageSize: 500,
    nutrition: { kcal: 98, proteinG: 21.5, fatG: 1.3, carbohydratesG: 0, fiberG: 0 },
    ...known("filet z piersi kurczaka"),
    foodGroups: ["meat"],
  }),
  demo({
    id: "losos",
    name: "Łosoś atlantycki, filet ze skórą",
    category: "fish",
    baseUnit: "g",
    packageSize: 250,
    nutrition: { kcal: 201, proteinG: 20, fatG: 13.4, carbohydratesG: 0, fiberG: 0 },
    ...known("łosoś atlantycki (ryba)", { fish: "contains" }),
    foodGroups: ["fish"],
  }),
  demo({
    id: "ciecierzyca-konserwowa",
    name: "Ciecierzyca konserwowa (po odsączeniu)",
    category: "legumes",
    baseUnit: "g",
    packageSize: 240,
    nutrition: { kcal: 115, proteinG: 6.7, fatG: 2.4, carbohydratesG: 14.5, fiberG: 6 },
    ...known("ciecierzyca, woda, sól"),
    foodGroups: [],
  }),
  demo({
    id: "tofu-naturalne",
    name: "Tofu naturalne",
    category: "legumes",
    baseUnit: "g",
    packageSize: 180,
    nutrition: { kcal: 124, proteinG: 12.5, fatG: 7.5, carbohydratesG: 1.5, fiberG: 0.8 },
    ...known("woda, nasiona soi, koagulant: chlorek magnezu", { soybeans: "contains" }),
    foodGroups: [],
  }),
  demo({
    id: "ryz-bialy",
    name: "Ryż biały długoziarnisty",
    category: "grains",
    baseUnit: "g",
    packageSize: 1000,
    nutrition: { kcal: 349, proteinG: 7, fatG: 0.6, carbohydratesG: 78, fiberG: 1.4 },
    ...known("ryż biały"),
    foodGroups: [],
  }),
  demo({
    id: "makaron-pelnoziarnisty",
    name: "Makaron pełnoziarnisty penne",
    category: "grains",
    baseUnit: "g",
    packageSize: 500,
    nutrition: { kcal: 352, proteinG: 13, fatG: 2.5, carbohydratesG: 64, fiberG: 8 },
    ...known("mąka pszenna pełnoziarnista z pszenicy durum, woda", { gluten: "contains", eggs: "may_contain" }),
    foodGroups: [],
  }),
  demo({
    id: "chleb-zytni",
    name: "Chleb żytni razowy",
    category: "bakery",
    baseUnit: "g",
    packageSize: 500,
    nutrition: { kcal: 220, proteinG: 6, fatG: 1.5, carbohydratesG: 41, fiberG: 8 },
    // celowo: skład nieznany — demonstracja statusu „wymaga weryfikacji”
    ingredientsText: null,
    allergens: { ingredientsKnown: false, declared: { gluten: "contains", sesame: "may_contain" } },
    foodGroups: [],
  }),
  demo({
    id: "pomidory-krojone",
    name: "Pomidory krojone w puszce",
    category: "vegetables",
    baseUnit: "g",
    packageSize: 400,
    nutrition: { kcal: 22, proteinG: 1.2, fatG: 0.2, carbohydratesG: 3.5, fiberG: 1 },
    ...known("pomidory, sok pomidorowy"),
    foodGroups: [],
  }),
  demo({
    id: "cebula",
    name: "Cebula",
    category: "vegetables",
    baseUnit: "g",
    packageSize: null,
    gramsPerPiece: 110,
    nutrition: { kcal: 40, proteinG: 1.1, fatG: 0.1, carbohydratesG: 8.5, fiberG: 1.7 },
    ...known("cebula"),
    foodGroups: [],
  }),
  demo({
    id: "papryka-czerwona",
    name: "Papryka czerwona",
    category: "vegetables",
    baseUnit: "g",
    packageSize: null,
    gramsPerPiece: 180,
    nutrition: { kcal: 31, proteinG: 1, fatG: 0.3, carbohydratesG: 6, fiberG: 2.1 },
    ...known("papryka czerwona"),
    foodGroups: [],
  }),
  demo({
    id: "banan",
    name: "Banan",
    category: "fruits",
    baseUnit: "g",
    packageSize: null,
    // masa bez skórki
    gramsPerPiece: 120,
    nutrition: { kcal: 89, proteinG: 1.1, fatG: 0.3, carbohydratesG: 20, fiberG: 2.6 },
    ...known("banan"),
    foodGroups: [],
  }),
  demo({
    id: "olej-rzepakowy",
    name: "Olej rzepakowy",
    category: "fats_oils",
    baseUnit: "ml",
    packageSize: 1000,
    densityGPerMl: 0.92,
    nutrition: { kcal: 828, proteinG: 0, fatG: 92, carbohydratesG: 0, fiberG: 0 },
    ...known("olej rzepakowy"),
    foodGroups: [],
  }),
  demo({
    id: "maslo-orzechowe",
    name: "Masło orzechowe 100%",
    category: "nuts_seeds",
    baseUnit: "g",
    packageSize: 350,
    nutrition: { kcal: 602, proteinG: 25, fatG: 50, carbohydratesG: 13, fiberG: 7 },
    ...known("prażone orzeszki ziemne", { peanuts: "contains", nuts: "may_contain" }),
    foodGroups: [],
  }),
  demo({
    id: "przyprawa-curry",
    name: "Przyprawa curry",
    category: "spices_condiments",
    baseUnit: "g",
    packageSize: 20,
    // celowo: brak wartości odżywczych i składu — demonstracja danych niepełnych
    nutrition: null,
    ingredientsText: null,
    allergens: { ingredientsKnown: false, declared: {} },
    foodGroups: [],
  }),
];
