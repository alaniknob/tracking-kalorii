import { describe, expect, it } from "vitest";
import { calculateMacros } from "@/features/nutrition/macros";
import { confirmedTotal, type PricingContext } from "@/features/pricing/cost";
import { DEMO_PRICES, DEMO_PROMOTIONS } from "@/features/pricing/demo-prices";
import { resolveFoodRules, type DietRulesInput, type RestrictionsInput } from "@/features/preferences/rules";
import { DEMO_PRODUCTS } from "@/features/products/demo-products";
import { evaluateRecipeFit } from "@/features/recipes/fit";
import { DEMO_RECIPES } from "@/features/recipes/demo-recipes";
import { CHAIN_STORES } from "@/features/stores/stores";
import { NO_PRACTICAL_LIMITS, type PracticalLimits } from "./candidates";
import { KCAL_TOLERANCE, PLAN_DAYS } from "./constants";
import { applyMealSwap, generateMealPlan, listSwapOptions, picksFromPlan, rebuildMealPlan, type PlannerInput } from "./generate";
import { validatePantry, type PantryItem } from "./pantry";

const TODAY = "2026-10-26";
const products = new Map(DEMO_PRODUCTS.map((p) => [p.id, p]));

const pricing = (over: Partial<PricingContext> = {}): PricingContext => ({
  products,
  prices: DEMO_PRICES,
  promotions: DEMO_PROMOTIONS,
  storeIds: new Set(CHAIN_STORES.map((s) => s.id)),
  today: TODAY,
  allowEstimates: true,
  ...over,
});

const targets = (kcal: number) => {
  const m = calculateMacros({ kcal, weightKg: 70, heightCm: 172, goal: "maintain" });
  return { kcal, proteinG: m.proteinG, fatG: m.fatG, carbohydratesG: m.carbohydratesG };
};

function input(over: {
  kcal?: number;
  meals?: number;
  diet?: Partial<DietRulesInput>;
  restrictions?: Partial<RestrictionsInput>;
  limits?: Partial<PracticalLimits>;
  budgetZl?: number | null;
  pantry?: PantryItem[];
  pricing?: Partial<PricingContext>;
} = {}): PlannerInput {
  const diet = { dietStyles: [], dislikedProducts: [], preferredProducts: [], ...over.diet } as DietRulesInput;
  const restrictions = { allergens: [], otherAllergies: [], otherIntolerances: [], voluntaryExclusions: [], ...over.restrictions };
  return {
    targets: targets(over.kcal ?? 2000),
    mealsPerDay: over.meals ?? 4,
    recipes: DEMO_RECIPES,
    products,
    rules: resolveFoodRules(diet, restrictions, DEMO_PRODUCTS),
    limits: { ...NO_PRACTICAL_LIMITS, ...over.limits },
    pricing: pricing(over.pricing),
    budgetGrosze: over.budgetZl === undefined ? 250_00 : over.budgetZl === null ? null : over.budgetZl * 100,
    pantry: over.pantry ?? [],
  };
}

const planned = (i: PlannerInput) => {
  const outcome = generateMealPlan(i);
  if (outcome.status !== "planned") throw new Error(`Expected a plan, got ${JSON.stringify(outcome.reasons)}`);
  return outcome.plan;
};

describe("generator jadłospisu — podstawy", () => {
  it("układa 7 dni × liczba posiłków, każdy dzień w tolerancji energii", () => {
    const plan = planned(input());
    expect(plan.meals).toHaveLength(PLAN_DAYS * 4);
    expect(plan.slots).toEqual(["breakfast", "second_breakfast", "lunch", "dinner"]);
    for (const day of plan.days) {
      expect(Math.abs(day.kcal - 2000)).toBeLessThanOrEqual(2000 * KCAL_TOLERANCE);
      expect(day.withinTolerance).toBe(true);
    }
  });

  it("jest deterministyczny — te same dane dają ten sam plan", () => {
    const a = planned(input());
    const b = planned(input());
    expect(a.meals.map((m) => `${m.recipe.id}×${m.factor}`)).toEqual(b.meals.map((m) => `${m.recipe.id}×${m.factor}`));
  });

  it("posiłki pasują do miejsca w dniu (śniadanie → przepis śniadaniowy itd.)", () => {
    const plan = planned(input({ meals: 5 }));
    for (const meal of plan.meals) {
      const allowed = { breakfast: "breakfast", second_breakfast: "snack", lunch: "lunch", afternoon_snack: "snack", dinner: "dinner" } as const;
      expect(meal.recipe.mealTypes).toContain(allowed[meal.slot as keyof typeof allowed]);
    }
  });

  it("różnorodność: żaden przepis nie jest gotowany częściej niż 3 razy w tygodniu", () => {
    const plan = planned(input());
    const cooked = new Map<string, number>();
    for (const meal of plan.meals) if (meal.leftoverOf === null) cooked.set(meal.recipe.id, (cooked.get(meal.recipe.id) ?? 0) + 1);
    expect(Math.max(...cooked.values())).toBeLessThanOrEqual(3);
  });
});

describe("twarde ograniczenia: alergie i dieta", () => {
  it("alergia na mleko: żaden posiłek nie zawiera nabiału ani alergenu, a skład nieznany jest pomijany", () => {
    const i = input({ restrictions: { allergens: [{ code: "milk", kind: "allergy", excludeTraces: true }] } });
    const plan = planned(i);
    for (const meal of plan.meals) {
      expect(evaluateRecipeFit(meal.recipe, products, i.rules).status).toBe("no_conflict_found");
      expect(meal.recipe.ingredients.some((x) => products.get(x.productId)!.allergens.declared.milk)).toBe(false);
      // chleb żytni ma nieznany skład → przepisy z nim „wymagają weryfikacji” i nie trafiają do planu
      expect(meal.recipe.ingredients.some((x) => x.productId === "chleb-zytni")).toBe(false);
    }
    expect(plan.warnings).toContainEqual(expect.objectContaining({ code: "verification_skipped" }));
  });

  it("dieta wegańska: tylko przepisy bez mięsa, ryb, jaj i nabiału", () => {
    const plan = planned(input({ diet: { dietStyles: ["vegan"] } }));
    const groups = new Set(plan.meals.flatMap((m) => m.recipe.ingredients.flatMap((x) => products.get(x.productId)!.foodGroups)));
    expect([...groups]).toEqual([]);
  });

  it("dieta „Z rybami”: ryba pojawia się w tygodniu", () => {
    const plan = planned(input({ diet: { dietStyles: ["with_fish"] } }));
    expect(plan.meals.some((m) => m.recipe.ingredients.some((x) => x.productId === "losos"))).toBe(true);
    expect(plan.warnings.map((w) => w.code)).not.toContain("required_group_missing");
  });

  it("budżet nigdy nie luzuje alergii — przy niskim budżecie plan nadal bez alergenu", () => {
    const i = input({ budgetZl: 20, restrictions: { allergens: [{ code: "peanuts", kind: "allergy", excludeTraces: true }] } });
    const plan = planned(i);
    expect(plan.status).toBe("over_budget");
    expect(plan.meals.some((m) => m.recipe.ingredients.some((x) => x.productId === "maslo-orzechowe"))).toBe(false);
  });
});

describe("budżet i koszty", () => {
  it("trzy rodzaje kosztów: zużyte ≤ opakowania, koszyk ≤ opakowania (bez mieszania szacunków)", () => {
    const plan = planned(input());
    const used = confirmedTotal(plan.full.used);
    const packages = confirmedTotal(plan.full.packages);
    expect(used).toBeLessThanOrEqual(packages);
    expect(confirmedTotal(plan.basket.packages)).toBeLessThanOrEqual(packages);
    expect(plan.full.packages.estimated).toBeGreaterThanOrEqual(0);
  });

  it("nierealny budżet: diagnoza z potrzebną kwotą i brakującą różnicą", () => {
    const plan = planned(input({ budgetZl: 20 }));
    expect(plan.status).toBe("over_budget");
    expect(plan.budget!.status).toBe("over");
    expect(plan.budget!.shortfallGrosze).toBe(plan.budget!.requiredGrosze - 20_00);
    expect(plan.budget!.suggestions.map((s) => s.code)).toContain("change_recipes");
    // potrzebny budżet wynika z najtańszego znalezionego planu — nie jest fikcyjną kwotą
    expect(plan.budget!.requiredGrosze).toBe(confirmedTotal(plan.basket.packages) + plan.basket.packages.estimated);
  });

  it("niższy budżet daje plan nie droższy niż przy wysokim (koszt jest optymalizowany)", () => {
    const rich = planned(input({ budgetZl: 1000 }));
    const tight = planned(input({ budgetZl: 120 }));
    const total = (p: typeof rich) => confirmedTotal(p.basket.packages) + p.basket.packages.estimated;
    expect(total(tight)).toBeLessThanOrEqual(total(rich));
  });

  it("zapasy zmniejszają koszyk, ale nie zmieniają kosztu zużytych składników", () => {
    const withoutPantry = planned(input());
    const rice = validatePantry([{ productId: "platki-owsiane", amount: "2", unit: "kg" }], products);
    expect(rice.ok).toBe(true);
    const withPantry = planned(input({ pantry: rice.ok ? rice.items : [] }));
    const basketTotal = (p: typeof withPantry) => confirmedTotal(p.basket.packages) + p.basket.packages.estimated;
    expect(basketTotal(withPantry)).toBeLessThanOrEqual(basketTotal(withoutPantry));
    const oats = withPantry.pantryUsed.find((p) => p.productId === "platki-owsiane");
    if (oats) expect(withPantry.basket.items.some((i) => i.productId === "platki-owsiane")).toBe(oats.usedBase < oats.availableBase ? false : true);
  });

  it("brak budżetu: plan powstaje z ostrzeżeniem, bez diagnozy budżetu", () => {
    const plan = planned(input({ budgetZl: null }));
    expect(plan.budget).toBeNull();
    expect(plan.warnings).toContainEqual({ code: "no_budget" });
  });
});

describe("niewykonalne ograniczenia — diagnoza z działaniami naprawczymi", () => {
  it("maks. 5 min przygotowania: brak obiadu, propozycja zwiększenia czasu", () => {
    const outcome = generateMealPlan(input({ limits: { maxPrepMinutes: 5 } }));
    expect(outcome.status).toBe("infeasible");
    if (outcome.status !== "infeasible") return;
    const lunch = outcome.reasons.find((r) => r.code === "no_recipes_for_slot" && r.slot === "lunch");
    expect(lunch).toBeDefined();
    if (lunch?.code !== "no_recipes_for_slot") return;
    expect(lunch.practical.prep_time).toBeGreaterThan(0);
    expect(lunch.remedies).toContainEqual({ code: "raise_prep_time", minutes: 25 });
  });

  it("brak kuchenki i piekarnika: propozycja dodania wyposażenia", () => {
    const outcome = generateMealPlan(input({ limits: { equipment: [] } }));
    expect(outcome.status).toBe("infeasible");
    if (outcome.status !== "infeasible") return;
    const lunch = outcome.reasons.find((r) => r.code === "no_recipes_for_slot" && r.slot === "lunch");
    expect(lunch?.code === "no_recipes_for_slot" && lunch.remedies.some((r) => r.code === "add_equipment")).toBe(true);
  });

  it("cel kaloryczny poza zasięgiem przy 2 posiłkach — propozycja zwiększenia liczby posiłków", () => {
    const outcome = generateMealPlan(input({ kcal: 4500, meals: 2 }));
    expect(outcome.status).toBe("infeasible");
    if (outcome.status !== "infeasible") return;
    expect(outcome.reasons[0]).toMatchObject({ code: "energy_out_of_reach", direction: "too_high", remedies: [{ code: "more_meals_per_day" }] });
  });

  it("wykluczenia dietą: wskazanie przepisów wykluczonych przez reguły", () => {
    const outcome = generateMealPlan(
      input({ diet: { dietStyles: ["vegan"] }, restrictions: { allergens: [{ code: "soybeans", kind: "allergy", excludeTraces: true }, { code: "gluten", kind: "allergy", excludeTraces: true }] } }),
    );
    expect(outcome.status).toBe("infeasible");
    if (outcome.status !== "infeasible") return;
    const breakfast = outcome.reasons.find((r) => r.code === "no_recipes_for_slot" && r.slot === "breakfast");
    expect(breakfast?.code === "no_recipes_for_slot" && breakfast.excludedByRules).toBeGreaterThan(0);
    expect(breakfast?.code === "no_recipes_for_slot" && breakfast.remedies.map((r) => r.code)).toContain("review_diet");
  });
});

describe("preferencje i resztki", () => {
  it("preferowany produkt zgodny z dietą zwiększa jego udział w planie", () => {
    const count = (p: ReturnType<typeof planned>) => p.meals.filter((m) => m.recipe.ingredients.some((x) => x.productId === "soczewica-czerwona")).length;
    const base = planned(input());
    const preferring = planned(input({ diet: { preferredProducts: ["soczewica"] } }));
    expect(count(preferring)).toBeGreaterThanOrEqual(count(base));
    expect(count(preferring)).toBeGreaterThan(0);
  });

  it("preferowany produkt sprzeczny z dietą jest usuwany z preferencji z komunikatem", () => {
    const rules = resolveFoodRules({ dietStyles: ["vegan"], dislikedProducts: [], preferredProducts: ["jogurt", "tofu"] }, null, DEMO_PRODUCTS);
    expect(rules.preferredProducts).toEqual(["tofu"]);
    expect(rules.conflicts).toContainEqual({
      code: "preferred_product_conflicts_rules",
      severity: "resolved",
      product: "jogurt",
      matches: ["Jogurt naturalny"],
      reason: { kind: "group", group: "dairy" },
    });
    expect(rules.hasBlockingConflict).toBe(false);
  });

  it("preferowany produkt wykluczony alergenem — konflikt z alergenem", () => {
    const rules = resolveFoodRules(
      { dietStyles: [], dislikedProducts: [], preferredProducts: ["masło orzechowe"] },
      { allergens: [{ code: "peanuts", kind: "allergy", excludeTraces: true }], otherAllergies: [], otherIntolerances: [], voluntaryExclusions: [] },
      DEMO_PRODUCTS,
    );
    expect(rules.conflicts[0]).toMatchObject({ code: "preferred_product_conflicts_rules", reason: { kind: "allergen", allergen: "peanuts" } });
  });

  it("resztki: przy włączonej opcji obiad bywa gotowany na dwa dni (0 min przygotowania drugiego dnia)", () => {
    const plan = planned(input({ limits: { useLeftovers: true } }));
    const leftovers = plan.meals.filter((m) => m.leftoverOf !== null);
    for (const meal of leftovers) {
      const source = plan.meals[meal.leftoverOf!];
      expect(source.recipe.id).toBe(meal.recipe.id);
      expect(source.day).toBe(meal.day - 1);
      expect(meal.prepMinutes).toBe(0);
      expect(source.leftoverFor).toBe(plan.meals.indexOf(meal));
    }
    const off = planned(input({ limits: { useLeftovers: false } }));
    expect(off.meals.every((m) => m.leftoverOf === null)).toBe(true);
  });
});

describe("zapasy — walidacja", () => {
  it("odrzuca nieznany produkt, złą ilość, nieprzeliczalną jednostkę i duplikat", () => {
    const result = validatePantry(
      [
        { productId: "nie-ma", amount: "1", unit: "g" },
        { productId: "ryz-bialy", amount: "0", unit: "g" },
        { productId: "ryz-bialy", amount: "1", unit: "szt" },
        { productId: "jaja", amount: "4", unit: "szt" },
        { productId: "jaja", amount: "2", unit: "szt" },
        { productId: "", amount: "", unit: "g" },
      ],
      products,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((e) => e.row)).toEqual([1, 2, 3, 5]);
  });

  it("przelicza na jednostkę bazową (sztuki → gramy)", () => {
    const result = validatePantry([{ productId: "jaja", amount: "4", unit: "szt" }], products);
    expect(result).toEqual({ ok: true, items: [{ productId: "jaja", amount: 4, unit: "szt", baseAmount: 200 }] });
  });
});

describe("ręczna zamiana posiłku", () => {
  it("odtwarza identyczny plan z zapisanych wyborów", () => {
    const original = planned(input());
    const rebuilt = rebuildMealPlan(input(), picksFromPlan(original));
    expect(rebuilt.status).toBe("planned");
    if (rebuilt.status !== "planned") return;
    expect(rebuilt.plan.meals.map((m) => `${m.recipe.id}×${m.factor}`)).toEqual(
      original.meals.map((m) => `${m.recipe.id}×${m.factor}`),
    );
  });

  it("proponuje inny przepis na ten sam slot i zamiana go wstawia", () => {
    const i = input();
    const original = planned(i);
    const options = listSwapOptions(i, picksFromPlan(original), 0);
    expect(options.some((o) => o.current)).toBe(true);
    const alternative = options.find((o) => !o.current);
    expect(alternative).toBeDefined();
    const swapped = applyMealSwap(i, picksFromPlan(original), 0, alternative!.recipeId, alternative!.factor);
    expect(swapped.status).toBe("planned");
    if (swapped.status !== "planned") return;
    expect(swapped.plan.meals[0].recipe.id).toBe(alternative!.recipeId);
    expect(swapped.plan.meals.slice(1).map((m) => m.recipe.id)).toEqual(original.meals.slice(1).map((m) => m.recipe.id));
    expect(evaluateRecipeFit(swapped.plan.meals[0].recipe, products, i.rules).status).toBe("no_conflict_found");
  });

  it("nie wstawia przepisu wykluczonego alergią", () => {
    const i = input({ restrictions: { allergens: [{ code: "milk", kind: "allergy", excludeTraces: true }] } });
    const original = planned(i);
    const dairy = DEMO_RECIPES.find((r) => r.ingredients.some((x) => products.get(x.productId)?.allergens.declared.milk));
    expect(dairy).toBeDefined();
    const swapped = applyMealSwap(i, picksFromPlan(original), 0, dairy!.id, 1);
    expect(swapped.status).toBe("infeasible");
  });
});
