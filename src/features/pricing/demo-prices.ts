import type { QuantityUnit } from "@/features/products/types";
import type { PriceSource, Promotion, StorePrice } from "./types";

/**
 * CENY PRZYKŁADOWE (DEMO). Kwoty i daty są wymyślone do demonstracji obliczeń — NIE są
 * cenami ani promocjami żadnego sklepu. Nazwy sieci służą tylko jako etykiety sklepów
 * w przykładzie. Daty pozyskania są stałe, więc status aktualności zmienia się z upływem czasu
 * zgodnie z regułą (`PRICE_STALE_AFTER_DAYS`), tak jak dla prawdziwych danych.
 */
export const DEMO_PRICE_SOURCE: PriceSource = {
  kind: "demo",
  name: "Ceny przykładowe (demo) — nie są aktualnymi cenami sklepów",
  url: null,
  isDemo: true,
};

type Row = [productId: string, storeId: string, pln: string, amount: number, unit: QuantityUnit, observedOn: string, estimate?: "szac"];

const ROWS: Row[] = [
  ["platki-owsiane", "lidl", "3.49", 500, "g", "2026-10-21"],
  ["platki-owsiane", "biedronka", "3.29", 500, "g", "2026-10-22"],
  ["platki-owsiane", "kaufland", "5.99", 1, "kg", "2026-10-20"],
  ["platki-owsiane", "auchan", "3.79", 500, "g", "2026-08-30"],
  ["mleko-2", "lidl", "3.79", 1, "l", "2026-10-21"],
  ["mleko-2", "biedronka", "3.69", 1, "l", "2026-10-22"],
  ["mleko-2", "carrefour", "3.99", 1, "l", "2026-10-19"],
  ["jogurt-naturalny", "lidl", "2.49", 400, "g", "2026-10-21"],
  ["jogurt-naturalny", "biedronka", "2.39", 400, "g", "2026-10-22"],
  ["jogurt-naturalny", "kaufland", "1.49", 180, "g", "2026-10-20"],
  ["jaja", "lidl", "10.99", 10, "szt", "2026-10-21"],
  ["jaja", "biedronka", "11.49", 10, "szt", "2026-10-22"],
  ["jaja", "aldi", "6.99", 6, "szt", "2026-10-23"],
  ["piers-kurczaka", "lidl", "15.99", 500, "g", "2026-10-21"],
  ["piers-kurczaka", "kaufland", "29.99", 1, "kg", "2026-10-20"],
  ["piers-kurczaka", "biedronka", "16.99", 500, "g", "2026-10-15", "szac"],
  ["losos", "lidl", "19.99", 250, "g", "2026-10-21"],
  ["losos", "carrefour", "21.99", 250, "g", "2026-10-19"],
  ["ciecierzyca-konserwowa", "biedronka", "3.49", 240, "g", "2026-10-22"],
  ["ciecierzyca-konserwowa", "lidl", "3.29", 240, "g", "2026-09-10"],
  ["tofu-naturalne", "lidl", "5.99", 180, "g", "2026-10-21"],
  ["tofu-naturalne", "carrefour", "6.49", 200, "g", "2026-10-19"],
  ["ryz-bialy", "lidl", "4.99", 1, "kg", "2026-10-21"],
  ["ryz-bialy", "biedronka", "2.79", 400, "g", "2026-10-22"],
  ["ryz-bialy", "kaufland", "5.49", 1, "kg", "2026-10-20"],
  ["makaron-pelnoziarnisty", "lidl", "4.49", 500, "g", "2026-10-21"],
  ["makaron-pelnoziarnisty", "biedronka", "4.29", 500, "g", "2026-10-22"],
  ["chleb-zytni", "biedronka", "5.99", 500, "g", "2026-10-22"],
  ["chleb-zytni", "lidl", "5.49", 500, "g", "2026-10-18", "szac"],
  ["pomidory-krojone", "lidl", "2.99", 400, "g", "2026-10-21"],
  ["pomidory-krojone", "biedronka", "2.89", 400, "g", "2026-10-22"],
  ["pomidory-krojone", "aldi", "2.79", 400, "g", "2026-10-23"],
  ["cebula", "lidl", "3.49", 1, "kg", "2026-10-21"],
  ["cebula", "biedronka", "3.99", 1, "kg", "2026-10-22"],
  ["cebula", "kaufland", "0.45", 1, "szt", "2026-10-20", "szac"],
  ["papryka-czerwona", "lidl", "13.99", 1, "kg", "2026-10-21"],
  ["papryka-czerwona", "biedronka", "7.99", 500, "g", "2026-10-22"],
  ["banan", "lidl", "5.99", 1, "kg", "2026-10-21"],
  ["banan", "biedronka", "6.49", 1, "kg", "2026-10-22"],
  ["olej-rzepakowy", "lidl", "8.99", 1, "l", "2026-10-21"],
  ["olej-rzepakowy", "biedronka", "9.49", 1, "l", "2026-10-22"],
  ["olej-rzepakowy", "kaufland", "15.99", 2, "l", "2026-08-20"],
  ["maslo-orzechowe", "lidl", "9.99", 350, "g", "2026-10-21"],
  ["maslo-orzechowe", "carrefour", "11.99", 350, "g", "2026-10-10", "szac"],
  ["jablko", "lidl", "3.99", 1, "kg", "2026-10-21"],
  ["jablko", "biedronka", "4.29", 1, "kg", "2026-10-22"],
  ["jablko", "kaufland", "3.79", 1, "kg", "2026-10-20"],
  ["marchew", "lidl", "2.99", 1, "kg", "2026-10-21"],
  ["marchew", "biedronka", "2.79", 1, "kg", "2026-10-22"],
  ["ziemniaki", "lidl", "6.99", 2, "kg", "2026-10-21"],
  ["ziemniaki", "biedronka", "5.99", 2, "kg", "2026-10-22"],
  ["ziemniaki", "aldi", "7.49", 2, "kg", "2026-10-23"],
  ["soczewica-czerwona", "lidl", "5.49", 400, "g", "2026-10-21"],
  ["soczewica-czerwona", "kaufland", "6.29", 500, "g", "2026-10-20"],
  ["kasza-gryczana", "lidl", "4.99", 400, "g", "2026-10-21"],
  ["kasza-gryczana", "biedronka", "3.99", 400, "g", "2026-10-22"],
  ["twarog-poltlusty", "lidl", "4.29", 250, "g", "2026-10-21"],
  ["twarog-poltlusty", "biedronka", "3.99", 250, "g", "2026-10-22"],
  ["napoj-sojowy", "lidl", "5.99", 1, "l", "2026-10-21"],
  ["napoj-sojowy", "carrefour", "6.49", 1, "l", "2026-10-19"],
  // „przyprawa-curry” celowo bez ceny — demonstracja stanu „brak ceny”.
];

const grosze = (pln: string) => Math.round(Number(pln) * 100);

export const DEMO_PRICES: StorePrice[] = ROWS.map(([productId, storeId, pln, amount, unit, observedOn, estimate], i) => ({
  id: `demo-cena-${i + 1}`,
  productId,
  storeId,
  priceGrosze: grosze(pln),
  currency: "PLN",
  packageAmount: amount,
  packageUnit: unit,
  observedOn,
  isEstimate: estimate === "szac",
  source: DEMO_PRICE_SOURCE,
}));

export const DEMO_PROMOTIONS: Promotion[] = [
  {
    id: "demo-promocja-1",
    productId: "mleko-2",
    storeId: "biedronka",
    promoPriceGrosze: 299,
    currency: "PLN",
    packageAmount: 1,
    packageUnit: "l",
    startsOn: "2026-10-01",
    endsOn: "2026-10-12",
    conditions: null,
    source: DEMO_PRICE_SOURCE,
  },
  {
    id: "demo-promocja-2",
    productId: "losos",
    storeId: "lidl",
    promoPriceGrosze: 1599,
    currency: "PLN",
    packageAmount: 250,
    packageUnit: "g",
    startsOn: "2026-10-22",
    endsOn: "2026-11-04",
    conditions: null,
    source: DEMO_PRICE_SOURCE,
  },
  {
    id: "demo-promocja-3",
    productId: "tofu-naturalne",
    storeId: "lidl",
    promoPriceGrosze: 449,
    currency: "PLN",
    packageAmount: 180,
    packageUnit: "g",
    startsOn: "2026-10-22",
    endsOn: "2026-11-04",
    conditions: "Przykładowy warunek: przy zakupie 2 opakowań",
    source: DEMO_PRICE_SOURCE,
  },
];
