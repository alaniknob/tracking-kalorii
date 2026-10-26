import { toBaseAmount } from "@/features/products/quantity";
import type { BaseUnit, Product, QuantityUnit } from "@/features/products/types";
import { UNIT_PRICE_BASE_AMOUNT } from "./constants";
import { priceStatus, promotionStatus } from "./freshness";
import type { Grosze, PriceSource, PriceStatus, Promotion, StorePrice } from "./types";

/** Konkretna możliwość zakupu: opakowanie w sklepie w cenie regularnej lub promocyjnej. */
export interface Offer {
  id: string;
  productId: string;
  storeId: string;
  kind: "regular" | "promotion";
  priceGrosze: Grosze;
  packageAmount: number;
  packageUnit: QuantityUnit;
  /** Jednostka bazowa produktu (g lub ml) i wielkość opakowania w tej jednostce. */
  baseUnit: BaseUnit;
  packageBase: number;
  /** Cena za 1 kg / 1 l. */
  unitPriceGrosze: Grosze;
  /** Cena za sztukę, gdy opakowanie jest liczone w sztukach. */
  piecePriceGrosze: Grosze | null;
  status: PriceStatus;
  /** Data pozyskania ceny albo początek promocji. */
  observedOn: string;
  promotionEndsOn: string | null;
  source: PriceSource;
}

export interface ProductOffers {
  offers: Offer[];
  /** Promocje, które już się skończyły — pokazywane informacyjnie, nigdy nie liczone. */
  expiredPromotions: Promotion[];
  upcomingPromotions: Promotion[];
  /** Aktywne promocje z warunkami (np. „przy zakupie 2 szt.”) — nie są wliczane automatycznie. */
  conditionalPromotions: Promotion[];
  /** Ceny, których opakowania nie da się przeliczyć na jednostkę produktu (np. ml bez gęstości). */
  unconvertible: string[];
}

export function unitPrice(priceGrosze: Grosze, packageBase: number): Grosze {
  return Math.round((priceGrosze * UNIT_PRICE_BASE_AMOUNT) / packageBase);
}

function packageBaseOf(amount: number, unit: QuantityUnit, product: Product): number | null {
  const base = toBaseAmount(amount, unit, product);
  return base.ok ? base.value : null;
}

/**
 * Oferty produktu w wybranych sklepach. Promocje liczą się tylko w okresie obowiązywania;
 * wygasłe i przyszłe są zwracane osobno. Brak ceny = brak oferty (nigdy cena zerowa).
 */
export function productOffers(
  product: Product,
  prices: readonly StorePrice[],
  promotions: readonly Promotion[],
  today: string,
  storeIds?: ReadonlySet<string>,
): ProductOffers {
  const inScope = (x: { productId: string; storeId: string }) =>
    x.productId === product.id && (!storeIds || storeIds.has(x.storeId));
  const result: ProductOffers = {
    offers: [],
    expiredPromotions: [],
    upcomingPromotions: [],
    conditionalPromotions: [],
    unconvertible: [],
  };

  for (const price of prices.filter(inScope)) {
    const packageBase = packageBaseOf(price.packageAmount, price.packageUnit, product);
    if (packageBase === null) {
      result.unconvertible.push(price.id);
      continue;
    }
    result.offers.push({
      id: price.id,
      productId: product.id,
      storeId: price.storeId,
      kind: "regular",
      priceGrosze: price.priceGrosze,
      packageAmount: price.packageAmount,
      packageUnit: price.packageUnit,
      baseUnit: product.baseUnit,
      packageBase,
      unitPriceGrosze: unitPrice(price.priceGrosze, packageBase),
      piecePriceGrosze: price.packageUnit === "szt" ? Math.round(price.priceGrosze / price.packageAmount) : null,
      status: priceStatus(price, today),
      observedOn: price.observedOn,
      promotionEndsOn: null,
      source: price.source,
    });
  }

  for (const promo of promotions.filter(inScope)) {
    const status = promotionStatus(promo, today);
    if (status === "expired") {
      result.expiredPromotions.push(promo);
      continue;
    }
    if (status === "upcoming") {
      result.upcomingPromotions.push(promo);
      continue;
    }
    if (promo.conditions !== null) {
      result.conditionalPromotions.push(promo);
      continue;
    }
    const packageBase = packageBaseOf(promo.packageAmount, promo.packageUnit, product);
    if (packageBase === null) {
      result.unconvertible.push(promo.id);
      continue;
    }
    result.offers.push({
      id: promo.id,
      productId: product.id,
      storeId: promo.storeId,
      kind: "promotion",
      priceGrosze: promo.promoPriceGrosze,
      packageAmount: promo.packageAmount,
      packageUnit: promo.packageUnit,
      baseUnit: product.baseUnit,
      packageBase,
      unitPriceGrosze: unitPrice(promo.promoPriceGrosze, packageBase),
      piecePriceGrosze: promo.packageUnit === "szt" ? Math.round(promo.promoPriceGrosze / promo.packageAmount) : null,
      status: "current",
      observedOn: promo.startsOn,
      promotionEndsOn: promo.endsOn,
      source: promo.source,
    });
  }

  return result;
}
