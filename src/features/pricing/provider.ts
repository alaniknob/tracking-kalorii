import type { Promotion, StorePrice } from "./types";

export interface PriceQuery {
  productIds?: readonly string[];
  storeIds?: readonly string[];
}

/**
 * Źródło cen. Implementacje: dane demo w pamięci, import CSV użytkownika; w przyszłości tabela
 * `store_prices` (Supabase) lub dostawca z udokumentowaną zgodą na wykorzystanie danych.
 * Nie zakładamy istnienia publicznych API sklepów i nie stosujemy scrapingu.
 */
export interface StorePriceProvider {
  readonly isDemo: boolean;
  getPrices(query?: PriceQuery): Promise<StorePrice[]>;
}

/** Źródło promocji — tylko potwierdzone promocje z okresem obowiązywania. */
export interface PromotionProvider {
  readonly isDemo: boolean;
  getPromotions(query?: PriceQuery): Promise<Promotion[]>;
}

function matches(query: PriceQuery | undefined, x: { productId: string; storeId: string }): boolean {
  return (
    (!query?.productIds || query.productIds.includes(x.productId)) &&
    (!query?.storeIds || query.storeIds.includes(x.storeId))
  );
}

export function createInMemoryPriceSource(
  prices: readonly StorePrice[],
  promotions: readonly Promotion[],
  isDemo: boolean,
): StorePriceProvider & PromotionProvider {
  return {
    isDemo,
    async getPrices(query) {
      return prices.filter((p) => matches(query, p));
    },
    async getPromotions(query) {
      return promotions.filter((p) => matches(query, p));
    },
  };
}

/** Łączy kilka źródeł; rekordy zachowują swoje oznaczenie źródła (demo / import). */
export function combinePriceSources(
  sources: readonly (StorePriceProvider & PromotionProvider)[],
): StorePriceProvider & PromotionProvider {
  return {
    isDemo: sources.some((s) => s.isDemo),
    async getPrices(query) {
      return (await Promise.all(sources.map((s) => s.getPrices(query)))).flat();
    },
    async getPromotions(query) {
      return (await Promise.all(sources.map((s) => s.getPromotions(query)))).flat();
    },
  };
}
