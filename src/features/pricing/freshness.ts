import { PRICE_STALE_AFTER_DAYS } from "./constants";
import { daysBetween } from "./dates";
import type { PriceStatus, Promotion, PromotionStatus, StorePrice } from "./types";

/** Szacunkowa zawsze pozostaje szacunkowa; potwierdzona starzeje się po `PRICE_STALE_AFTER_DAYS`. */
export function priceStatus(price: Pick<StorePrice, "isEstimate" | "observedOn">, today: string): PriceStatus {
  if (price.isEstimate) return "estimated";
  return daysBetween(price.observedOn, today) > PRICE_STALE_AFTER_DAYS ? "stale" : "current";
}

export function promotionStatus(promo: Pick<Promotion, "startsOn" | "endsOn">, today: string): PromotionStatus {
  if (today < promo.startsOn) return "upcoming";
  if (today > promo.endsOn) return "expired";
  return "active";
}

/** Kolejność wyboru cen: aktualne potwierdzone → nieaktualne potwierdzone → szacunkowe. */
export const STATUS_PRIORITY: Record<PriceStatus, number> = { current: 0, stale: 1, estimated: 2 };
