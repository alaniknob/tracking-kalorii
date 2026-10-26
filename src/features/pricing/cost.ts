import { packagesNeeded } from "@/features/products/quantity";
import type { Product } from "@/features/products/types";
import { proportionalGrosze } from "./money";
import { STATUS_PRIORITY } from "./freshness";
import { productOffers, type Offer } from "./offers";
import { PRICE_STATUSES, type Grosze, type PriceStatus, type Promotion, type StorePrice } from "./types";

/** Zapotrzebowanie na produkt w jednostce bazowej (g lub ml). */
export interface Need {
  productId: string;
  baseAmount: number;
}

export interface PricingContext {
  products: ReadonlyMap<string, Product>;
  prices: readonly StorePrice[];
  promotions: readonly Promotion[];
  /** Sklepy wybrane przez użytkownika. */
  storeIds: ReadonlySet<string>;
  today: string;
  /** Czy wolno użyć cen szacunkowych, gdy brak potwierdzonych. */
  allowEstimates: boolean;
}

export interface OfferChoice {
  offer: Offer;
  packages: number;
  /** Koszt koniecznych (całych) opakowań. */
  packagesCostGrosze: Grosze;
  /** Koszt faktycznie zużytej części. */
  usedCostGrosze: Grosze;
  /** Pozostałość po zakupie (w jednostce bazowej). */
  leftoverBase: number;
}

export type MissingReason = "unknown_product" | "no_price" | "only_estimates";

export type ItemCost =
  | {
      productId: string;
      needBase: number;
      priced: true;
      choice: OfferChoice;
      /** W wybranym sklepie była promocja, która już wygasła — nie została uwzględniona. */
      expiredPromotion: Promotion | null;
      /** Tańsza oferta tego samego produktu w sklepie spoza wybranych (ten sam lub lepszy status). */
      cheaperElsewhere: (OfferChoice & { savingGrosze: Grosze }) | null;
    }
  | { productId: string; needBase: number; priced: false; reason: MissingReason };

export type StatusTotals = Record<PriceStatus, Grosze>;

export interface BasketCost {
  items: ItemCost[];
  /** Sumy osobno dla każdego statusu ceny — potwierdzone i szacunkowe nie są łączone. */
  used: StatusTotals;
  packages: StatusTotals;
  missingCount: number;
}

const emptyTotals = (): StatusTotals => ({ current: 0, stale: 0, estimated: 0 });

export const confirmedTotal = (t: StatusTotals): Grosze => t.current + t.stale;

export function chooseFor(offer: Offer, needBase: number): OfferChoice {
  const packages = packagesNeeded(needBase, offer.packageBase);
  return {
    offer,
    packages,
    packagesCostGrosze: packages * offer.priceGrosze,
    usedCostGrosze: proportionalGrosze(offer.priceGrosze, needBase, offer.packageBase),
    leftoverBase: packages * offer.packageBase - needBase,
  };
}

/**
 * Najlepsza oferta: najpierw najlepszy dostępny status (aktualna → nieaktualna → szacunkowa),
 * dopiero w jego obrębie najniższy koszt opakowań (potem mniejsza pozostałość). Tańsza cena
 * szacunkowa nigdy nie wypiera potwierdzonej.
 */
export function bestChoice(offers: readonly Offer[], needBase: number): OfferChoice | null {
  let best: OfferChoice | null = null;
  for (const offer of offers) {
    const choice = chooseFor(offer, needBase);
    if (!best) {
      best = choice;
      continue;
    }
    const byStatus = STATUS_PRIORITY[offer.status] - STATUS_PRIORITY[best.offer.status];
    const byCost = choice.packagesCostGrosze - best.packagesCostGrosze;
    const byLeftover = choice.leftoverBase - best.leftoverBase;
    if (byStatus < 0 || (byStatus === 0 && (byCost < 0 || (byCost === 0 && byLeftover < 0)))) best = choice;
  }
  return best;
}

/** Koszt listy potrzeb w wybranych sklepach — z podziałem na koszt zużyty i koszt opakowań. */
export function costNeeds(needs: readonly Need[], ctx: PricingContext): BasketCost {
  const used = emptyTotals();
  const packages = emptyTotals();
  const items: ItemCost[] = [];

  for (const need of mergeNeeds(needs)) {
    const product = ctx.products.get(need.productId);
    if (!product) {
      items.push({ productId: need.productId, needBase: need.baseAmount, priced: false, reason: "unknown_product" });
      continue;
    }
    const all = productOffers(product, ctx.prices, ctx.promotions, ctx.today);
    const allowed = (o: Offer) => ctx.allowEstimates || o.status !== "estimated";
    const selected = all.offers.filter((o) => ctx.storeIds.has(o.storeId));
    const choice = bestChoice(selected.filter(allowed), need.baseAmount);

    if (!choice) {
      const reason: MissingReason = selected.length > 0 ? "only_estimates" : "no_price";
      items.push({ productId: need.productId, needBase: need.baseAmount, priced: false, reason });
      continue;
    }

    const elsewhere = bestChoice(
      all.offers.filter(
        (o) => !ctx.storeIds.has(o.storeId) && allowed(o) && STATUS_PRIORITY[o.status] <= STATUS_PRIORITY[choice.offer.status],
      ),
      need.baseAmount,
    );
    const saving = elsewhere ? choice.packagesCostGrosze - elsewhere.packagesCostGrosze : 0;

    used[choice.offer.status] += choice.usedCostGrosze;
    packages[choice.offer.status] += choice.packagesCostGrosze;
    items.push({
      productId: need.productId,
      needBase: need.baseAmount,
      priced: true,
      choice,
      expiredPromotion: all.expiredPromotions.find((p) => p.storeId === choice.offer.storeId) ?? null,
      cheaperElsewhere: elsewhere && saving > 0 ? { ...elsewhere, savingGrosze: saving } : null,
    });
  }

  return { items, used, packages, missingCount: items.filter((i) => !i.priced).length };
}

/** Te same produkty z różnych przepisów są sumowane — kupujemy je raz, w całych opakowaniach. */
export function mergeNeeds(needs: readonly Need[]): Need[] {
  const merged = new Map<string, number>();
  for (const need of needs) merged.set(need.productId, (merged.get(need.productId) ?? 0) + need.baseAmount);
  return [...merged].map(([productId, baseAmount]) => ({ productId, baseAmount }));
}

export const sumTotals = (t: StatusTotals): Grosze => PRICE_STATUSES.reduce((sum, s) => sum + t[s], 0);
