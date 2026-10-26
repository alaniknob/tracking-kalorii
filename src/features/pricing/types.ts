import type { QuantityUnit } from "@/features/products/types";

export const PRICE_SOURCE_KINDS = ["demo", "csv_import", "manual", "provider"] as const;
export type PriceSourceKind = (typeof PRICE_SOURCE_KINDS)[number];

export interface PriceSource {
  kind: PriceSourceKind;
  name: string;
  url: string | null;
  isDemo: boolean;
}

/** Kwoty w groszach (liczby całkowite) — bez błędów zaokrągleń liczb zmiennoprzecinkowych. */
export type Grosze = number;

/**
 * Cena opakowania w sklepie. Cena jest oddzielona od wartości odżywczych produktu.
 * `isEstimate` = cena szacunkowa (nie odczytana ze sklepu) — nigdy nie jest sumowana z potwierdzonymi.
 */
export interface StorePrice {
  id: string;
  productId: string;
  storeId: string;
  priceGrosze: Grosze;
  currency: "PLN";
  packageAmount: number;
  packageUnit: QuantityUnit;
  /** Data pozyskania ceny (YYYY-MM-DD). */
  observedOn: string;
  isEstimate: boolean;
  source: PriceSource;
}

/** Promocja zawsze pochodzi z potwierdzonego źródła — nie ma promocji szacunkowych. */
export interface Promotion {
  id: string;
  productId: string;
  storeId: string;
  promoPriceGrosze: Grosze;
  currency: "PLN";
  packageAmount: number;
  packageUnit: QuantityUnit;
  startsOn: string;
  endsOn: string;
  conditions: string | null;
  source: PriceSource;
}

/** Status aktualności ceny wyliczany przy odczycie (nie przechowywany). */
export const PRICE_STATUSES = ["current", "stale", "estimated"] as const;
export type PriceStatus = (typeof PRICE_STATUSES)[number];

export type PromotionStatus = "active" | "upcoming" | "expired";
