import type { AllergenInfo } from "@/features/allergens";
import type { FoodGroup } from "@/features/preferences/diet-styles";

export const PRODUCT_CATEGORIES = [
  "grains",
  "bakery",
  "dairy",
  "eggs",
  "meat",
  "fish",
  "legumes",
  "vegetables",
  "fruits",
  "nuts_seeds",
  "fats_oils",
  "spices_condiments",
  "other",
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** Jednostka bazowa produktu: masa (g) lub objętość (ml). */
export const BASE_UNITS = ["g", "ml"] as const;
export type BaseUnit = (typeof BASE_UNITS)[number];

/** Jednostki ilości w przepisach i na listach zakupów. */
export const QUANTITY_UNITS = ["g", "kg", "ml", "l", "szt"] as const;
export type QuantityUnit = (typeof QUANTITY_UNITS)[number];

export const DATA_COMPLETENESS = ["complete", "partial", "minimal"] as const;
export type DataCompleteness = (typeof DATA_COMPLETENESS)[number];

/** Wartości odżywcze na 100 g (baseUnit = g) lub 100 ml (baseUnit = ml). */
export interface NutritionPer100 {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbohydratesG: number;
  /** null = brak danych (nie zero). */
  fiberG: number | null;
}

export interface DataSource {
  /** Opis źródła, np. „Dane przykładowe (demo)”, „Etykieta producenta”, „Import CSV”. */
  name: string;
  url: string | null;
  isDemo: boolean;
}

/**
 * Produkt katalogowy — WYŁĄCZNIE dane produktu i wartości odżywcze.
 * Ceny w sklepach są osobnym modułem (`features/pricing`, etap 4).
 */
export interface Product {
  id: string;
  name: string;
  brand: string | null;
  category: ProductCategory;
  baseUnit: BaseUnit;
  /** Wielkość opakowania w jednostce bazowej (np. 500 g); null gdy produkt na wagę. */
  packageSize: number | null;
  /** Masa jednej sztuki (np. jajko ~ 60 g) — potrzebna do przeliczeń „szt”. */
  gramsPerPiece: number | null;
  /** Gęstość g/ml — potrzebna do przeliczeń objętości na masę. */
  densityGPerMl: number | null;
  /** null = brak danych o wartościach odżywczych. */
  nutrition: NutritionPer100 | null;
  ingredientsText: string | null;
  allergens: AllergenInfo;
  foodGroups: FoodGroup[];
  source: DataSource;
  /** Data ostatniej weryfikacji danych (ISO yyyy-mm-dd). */
  updatedAt: string;
}
