import { describe, expect, it } from "vitest";
import { costNeeds, type PricingContext } from "@/features/pricing/cost";
import { DEMO_PRICES, DEMO_PROMOTIONS } from "@/features/pricing/demo-prices";
import type { StorePrice } from "@/features/pricing/types";
import { resolveFoodRules } from "@/features/preferences/rules";
import { DEMO_PRODUCTS } from "@/features/products/demo-products";
import { DEMO_RECIPES } from "@/features/recipes/demo-recipes";
import { recipeNeeds } from "@/features/recipes/cost";
import { evaluateProductFit } from "@/features/recipes/fit";
import { diagnoseBudget, findCheaperAlternatives } from "./diagnose";
import { budgetSettingsSchema } from "./schema";

const TODAY = "2026-10-26";
const products = new Map(DEMO_PRODUCTS.map((p) => [p.id, p]));
const source = { kind: "csv_import" as const, name: "test", url: null, isDemo: false };
const price = (p: Partial<StorePrice>): StorePrice => ({
  id: "p",
  productId: "ryz-bialy",
  storeId: "lidl",
  priceGrosze: 500,
  currency: "PLN",
  packageAmount: 1,
  packageUnit: "kg",
  observedOn: "2026-10-20",
  isEstimate: false,
  source,
  ...p,
});
const ctx = (over: Partial<PricingContext> = {}): PricingContext => ({
  products,
  prices: [],
  promotions: [],
  storeIds: new Set(["lidl"]),
  today: TODAY,
  allowEstimates: true,
  ...over,
});
const budget = (zl: number, allowEstimates = true) => ({ weeklyBudgetGrosze: zl * 100, allowEstimates });

describe("ustawienia budżetu", () => {
  it("przyjmuje kwotę z przecinkiem i zakres 20–5000 zł", () => {
    expect(budgetSettingsSchema.parse({ weeklyBudget: "249,99", allowEstimates: "" })).toEqual({
      weeklyBudgetGrosze: 24999,
      allowEstimates: false,
    });
    for (const bad of ["", "abc", "19,99", "5000,01", "-50"]) {
      expect(budgetSettingsSchema.safeParse({ weeklyBudget: bad, allowEstimates: "on" }).success).toBe(false);
    }
  });
});

describe("diagnoza budżetu", () => {
  const rice = (over: Partial<StorePrice> = {}) => costNeeds([{ productId: "ryz-bialy", baseAmount: 1000 }], ctx({ prices: [price(over)] }));

  it("mieści się — tylko ceny potwierdzone", () => {
    expect(diagnoseBudget(rice(), budget(20))).toMatchObject({ status: "within", requiredGrosze: 500, shortfallGrosze: 0 });
  });

  it("mieści się, ale z cenami szacunkowymi — pokazane osobno", () => {
    const d = diagnoseBudget(rice({ isEstimate: true }), budget(20));
    expect(d).toMatchObject({ status: "within_with_estimates", confirmedGrosze: 0, estimatedGrosze: 500 });
  });

  it("brak cen: wynik niepewny, potrzebny budżet jako dolna granica", () => {
    const cost = costNeeds(
      [
        { productId: "ryz-bialy", baseAmount: 1000 },
        { productId: "przyprawa-curry", baseAmount: 5 },
      ],
      ctx({ prices: [price({})] }),
    );
    const d = diagnoseBudget(cost, budget(20));
    expect(d).toMatchObject({ status: "incomplete", requiredIsLowerBound: true });
    expect(d.suggestions).toContainEqual({ code: "missing_prices", count: 1 });
  });

  it("za niski: wylicza brakującą kwotę, potrzebny budżet, przyczyny i propozycje", () => {
    const cost = costNeeds(
      [{ productId: "ryz-bialy", baseAmount: 4000 }],
      ctx({ prices: [price({ priceGrosze: 900 }), price({ id: "a", storeId: "auchan", priceGrosze: 600 })] }),
    );
    const d = diagnoseBudget(cost, budget(20));
    expect(d).toMatchObject({ status: "over", requiredGrosze: 3600, shortfallGrosze: 1600 });
    expect(d.topCosts).toEqual([{ productId: "ryz-bialy", packagesCostGrosze: 3600 }]);
    expect(d.suggestions).toContainEqual({ code: "switch_store", productId: "ryz-bialy", storeId: "auchan", savingGrosze: 1200 });
    expect(d.suggestions.at(-1)).toEqual({ code: "change_recipes" });
  });

  it("brak zgody na szacunki → propozycja, by na nie zezwolić", () => {
    const cost = costNeeds([{ productId: "ryz-bialy", baseAmount: 1000 }], ctx({ prices: [price({ isEstimate: true })], allowEstimates: false }));
    expect(diagnoseBudget(cost, budget(20, false)).suggestions).toContainEqual({ code: "allow_estimates", count: 1 });
  });

  it("duże resztki z opakowań przy przekroczeniu → propozycja lepszego wykorzystania", () => {
    const cost = costNeeds([{ productId: "ryz-bialy", baseAmount: 100 }], ctx({ prices: [price({ priceGrosze: 5000 })] }));
    const d = diagnoseBudget(cost, budget(20));
    expect(d.leftoverValueGrosze).toBe(4500);
    expect(d.suggestions).toContainEqual({ code: "reduce_leftovers", leftoverValueGrosze: 4500 });
  });
});

describe("tańsze zamienniki", () => {
  const prices = [
    price({ id: "mleko", productId: "mleko-2", priceGrosze: 2000, packageAmount: 1, packageUnit: "l" }),
    price({ id: "jogurt", productId: "jogurt-naturalny", priceGrosze: 200, packageAmount: 400, packageUnit: "g" }),
    price({ id: "kasza", productId: "platki-owsiane", priceGrosze: 100, packageAmount: 500, packageUnit: "g" }),
    price({ id: "ryz", productId: "ryz-bialy", priceGrosze: 2000 }),
  ];
  const cheaper = (rules: Parameters<typeof evaluateProductFit>[1]) => {
    const c = ctx({ prices });
    const cost = costNeeds([{ productId: "ryz-bialy", baseAmount: 500 }], c);
    return findCheaperAlternatives(cost.items, c, DEMO_PRODUCTS, (p) => evaluateProductFit(p, rules).status === "no_conflict_found");
  };

  it("proponuje tańszy produkt z tej samej kategorii i jednostki", () => {
    const result = cheaper(resolveFoodRules(null, null));
    expect(result).toEqual([
      expect.objectContaining({ productId: "ryz-bialy", alternativeId: "platki-owsiane", alternativeUnitPriceGrosze: 200 }),
    ]);
  });

  it("nigdy nie proponuje zamiennika sprzecznego z alergią (gluten w płatkach)", () => {
    const rules = resolveFoodRules(null, {
      allergens: [{ code: "gluten", kind: "allergy", excludeTraces: true }],
      otherAllergies: [],
      otherIntolerances: [],
      voluntaryExclusions: [],
    });
    expect(cheaper(rules)).toEqual([]);
  });
});

describe("koszt przepisów demo", () => {
  it("każdy przepis demo da się przeliczyć na potrzeby, a koszyk wyceniony w sieciach demo", () => {
    const allStores = new Set(DEMO_PRICES.map((p) => p.storeId));
    for (const recipe of DEMO_RECIPES) {
      const { needs, unconvertible } = recipeNeeds(recipe, products);
      expect(unconvertible).toEqual([]);
      const cost = costNeeds(needs, ctx({ prices: DEMO_PRICES, promotions: DEMO_PROMOTIONS, storeIds: allStores }));
      const missing = cost.items.filter((i) => !i.priced).map((i) => i.productId);
      expect(missing.every((id) => id === "przyprawa-curry")).toBe(true);
    }
  });

  it("ten sam produkt w kilku przepisach jest kupowany raz (wspólne opakowania)", () => {
    const owsianka = DEMO_RECIPES.find((r) => r.id === "owsianka-bananowa")!;
    const twice = recipeNeeds(owsianka, products, 2).needs;
    const cost = costNeeds([...twice], ctx({ prices: DEMO_PRICES, storeIds: new Set(["lidl"]) }));
    expect(new Set(cost.items.map((i) => i.productId)).size).toBe(cost.items.length);
  });
});
