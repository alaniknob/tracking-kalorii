import type { PricingEnvironment } from "./environment";

export interface NameMaps {
  products: Record<string, string>;
  stores: Record<string, string>;
  /** Jednostka bazowa produktu (g lub ml), w której podawane są ilości potrzeb. */
  units: Record<string, string>;
}

/** Nazwy do wyświetlenia w komponentach klienckich (bez przesyłania całego katalogu). */
export function namesFor(env: Pick<PricingEnvironment, "products" | "knownStores">): NameMaps {
  return {
    products: Object.fromEntries(env.products.map((p) => [p.id, p.name])),
    stores: Object.fromEntries(env.knownStores.map((s) => [s.id, s.name])),
    units: Object.fromEntries(env.products.map((p) => [p.id, p.baseUnit])),
  };
}
