import { describe, expect, it } from "vitest";
import { loadPlannerEnvironment, runPlanner, sanitizePlannerDrafts } from "@/features/meal-planning/environment";
import { buildPlanView } from "@/features/meal-planning/view";
import { costNeeds, type Need, type PricingContext } from "@/features/pricing/cost";
import { DEMO_PRICES, DEMO_PROMOTIONS } from "@/features/pricing/demo-prices";
import { DEMO_PRODUCTS } from "@/features/products/demo-products";
import { CHAIN_STORES } from "@/features/stores/stores";
import { buildShoppingList, checkStateOf, progressOf, pruneChecked } from "./list";

const products = new Map(DEMO_PRODUCTS.map((p) => [p.id, p]));
const storeNames = Object.fromEntries(CHAIN_STORES.map((s) => [s.id, s.name]));
const ctx: PricingContext = {
  products,
  prices: DEMO_PRICES,
  promotions: DEMO_PROMOTIONS,
  storeIds: new Set(CHAIN_STORES.map((s) => s.id)),
  today: "2026-10-26",
  allowEstimates: true,
};

function listFor(meals: { recipeName: string; needs: Need[] }[], pantry: Record<string, number> = {}) {
  const needs = meals.flatMap((m) => m.needs);
  const full = costNeeds(needs, ctx);
  const basketNeeds = full.items
    .map((i) => ({ productId: i.productId, baseAmount: i.needBase - (pantry[i.productId] ?? 0) }))
    .filter((n) => n.baseAmount > 0);
  const pantryUsed = Object.entries(pantry).map(([productId, base]) => ({ productId, usedBase: base }));
  return buildShoppingList({ full, basket: costNeeds(basketNeeds, ctx), pantryUsed, meals, products, storeNames });
}

const MEALS = [
  { recipeName: "Jajecznica", needs: [{ productId: "jaja", baseAmount: 100 }, { productId: "ryz-bialy", baseAmount: 80 }] },
  { recipeName: "Kurczak curry", needs: [{ productId: "jaja", baseAmount: 150 }, { productId: "przyprawa-curry", baseAmount: 5 }] },
  { recipeName: "Ryż z warzywami", needs: [{ productId: "ryz-bialy", baseAmount: 120 }] },
];

describe("lista zakupów", () => {
  it("sumuje produkt z wielu posiłków w jedną pozycję w całych opakowaniach", () => {
    const list = listFor(MEALS);
    const eggs = list.toBuy.find((i) => i.productId === "jaja")!;
    expect(list.toBuy.filter((i) => i.productId === "jaja")).toHaveLength(1);
    expect(eggs.needBase).toBe(250);
    expect(eggs.toBuyBase).toBe(250);
    expect(eggs.pieces).toBe(5);
    expect(eggs.mealCount).toBe(2);
    expect(eggs.recipes).toEqual(["Jajecznica", "Kurczak curry"]);
    expect(eggs.purchase!.packages).toBeGreaterThanOrEqual(1);
    expect(eggs.purchase!.packagesCostGrosze).toBe(eggs.purchase!.packages * eggs.purchase!.priceGrosze);
  });

  it("brak ceny: pozycja zostaje na liście z przyczyną, w osobnej grupie sklepów, nie jako 0 zł", () => {
    const list = listFor(MEALS);
    const curry = list.toBuy.find((i) => i.productId === "przyprawa-curry")!;
    expect(curry.purchase).toBeNull();
    expect(curry.missingReason).toBe("no_price");
    expect(list.missingCount).toBe(1);
    expect(list.byStore.at(-1)!.key).toBeNull();
    expect(list.byStore.at(-1)!.items.map((i) => i.productId)).toEqual(["przyprawa-curry"]);
  });

  it("zapasy pokrywające całą potrzebę przenoszą pozycję do „Masz w domu”", () => {
    const list = listFor(MEALS, { "ryz-bialy": 500 });
    expect(list.toBuy.some((i) => i.productId === "ryz-bialy")).toBe(false);
    const rice = list.covered.find((i) => i.productId === "ryz-bialy")!;
    expect(rice.pantryBase).toBe(200);
    expect(rice.toBuyBase).toBe(0);

    const partial = listFor(MEALS, { jaja: 100 }).toBuy.find((i) => i.productId === "jaja")!;
    expect(partial.pantryBase).toBe(100);
    expect(partial.toBuyBase).toBe(150);
    expect(partial.pieces).toBe(3);
  });

  it("sumy grup (kategorie i sklepy) zgadzają się z sumą listy, osobno dla statusów cen", () => {
    const list = listFor(MEALS);
    for (const groups of [list.byCategory, list.byStore]) {
      expect(groups.flatMap((g) => g.items)).toHaveLength(list.toBuy.length);
      for (const status of ["current", "stale", "estimated"] as const) {
        expect(groups.reduce((s, g) => s + g.totals[status], 0)).toBe(list.totals[status]);
      }
    }
  });

  it("odhaczenie wygasa, gdy po zmianie planu zmienia się ilość; usunięte pozycje są czyszczone", () => {
    const before = listFor(MEALS);
    const eggs = before.toBuy.find((i) => i.productId === "jaja")!;
    const checked = { jaja: eggs.signature, "nie-ma-w-planie": "x" };
    expect(checkStateOf(eggs, checked)).toBe("checked");
    expect(progressOf(before, checked).boughtCount).toBe(1);
    expect(pruneChecked(before, checked)).toEqual({ jaja: eggs.signature });

    const after = listFor([...MEALS, { recipeName: "Omlet", needs: [{ productId: "jaja", baseAmount: 400 }] }]);
    const eggsAfter = after.toBuy.find((i) => i.productId === "jaja")!;
    expect(checkStateOf(eggsAfter, checked)).toBe("changed");
    expect(progressOf(after, checked).boughtCount).toBe(0);
  });

  it("kupione + pozostałe = całość", () => {
    const list = listFor(MEALS);
    const checked = Object.fromEntries(list.toBuy.slice(0, 1).map((i) => [i.productId, i.signature]));
    const p = progressOf(list, checked);
    for (const status of ["current", "stale", "estimated"] as const) {
      expect(p.bought[status] + p.remaining[status]).toBe(list.totals[status]);
    }
  });

  it("lista z wygenerowanego planu odpowiada koszykowi planu", async () => {
    const profile = JSON.stringify({
      birthDate: "1990-05-10",
      heightCm: "172",
      weightKg: "70",
      targetWeightKg: "",
      sex: "female",
      activityLevel: "moderate",
      goal: "maintain",
      mealsPerDay: "4",
      healthFlags: [],
    });
    const env = await loadPlannerEnvironment(sanitizePlannerDrafts({ profile }), "2026-10-26");
    const outcome = runPlanner(env);
    if (outcome?.status !== "planned") throw new Error("expected plan");
    const view = buildPlanView(outcome.plan, env.pricing, env.pantry, "2026-10-26");
    expect(view.shopping.toBuy).toHaveLength(view.basket.items.length);
    expect(view.shopping.totals).toEqual(view.basket.packages);
    expect(view.shopping.missingCount).toBe(view.basket.missingCount);
  });
});
