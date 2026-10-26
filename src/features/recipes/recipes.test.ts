import { describe, expect, it } from "vitest";
import type { AllergenExclusion } from "@/features/allergens";
import type { DietStyle } from "@/features/preferences/diet-styles";
import { resolveFoodRules } from "@/features/preferences/rules";
import { DEMO_PRODUCTS } from "@/features/products/demo-products";
import { DEMO_RECIPES } from "./demo-recipes";
import { aggregateRecipeAllergens, evaluateRecipeFit, recipeFoodGroups } from "./fit";
import { calculateRecipeNutrition } from "./nutrition";
import type { Recipe } from "./types";

const products = new Map(DEMO_PRODUCTS.map((p) => [p.id, p]));
const recipe = (id: string) => DEMO_RECIPES.find((r) => r.id === id)!;

function rules({
  diet = ["traditional"],
  allergens = [],
  disliked = [],
  otherAllergies = [],
}: { diet?: DietStyle[]; allergens?: AllergenExclusion[]; disliked?: string[]; otherAllergies?: string[] } = {}) {
  return resolveFoodRules(
    { dietStyles: diet, dislikedProducts: disliked, preferredProducts: [] },
    { allergens, otherAllergies, otherIntolerances: [], voluntaryExclusions: [] },
  );
}

const allergy = (code: AllergenExclusion["code"]): AllergenExclusion => ({ code, kind: "allergy", excludeTraces: true });

describe("calculateRecipeNutrition", () => {
  it("liczy kcal i makro ze składników (surowa masa × wartości na 100 g/ml)", () => {
    const n = calculateRecipeNutrition(recipe("owsianka-bananowa"), products);
    // 50 g płatków 186 + 250 ml mleka 125 + banan 120 g 106,8 + 15 g masła orzechowego 90,3
    expect(n.total).toEqual({ kcal: 508, proteinG: 20.1, fatG: 16.4, carbohydratesG: 67.3, fiberG: 9.2 });
    expect(n.rawMassG).toBe(443);
    expect(n.servingMassG).toBe(400);
    expect(n.per100gCooked?.kcal).toBe(127);
    expect(n.complete).toBe(true);
  });

  it("dzieli na porcje", () => {
    const n = calculateRecipeNutrition(recipe("makaron-z-ciecierzyca"), products);
    expect(n.perServing.kcal).toBe(Math.round(n.total.kcal / 2));
    expect(n.servingMassG).toBe(475);
  });

  it("bez masy po przygotowaniu porcja liczona z masy surowej, brak wartości na 100 g gotowej potrawy", () => {
    const n = calculateRecipeNutrition(recipe("jajecznica-z-papryka"), products);
    expect(n.per100gCooked).toBeNull();
    expect(n.servingMassG).toBe(n.rawMassG);
  });

  it("oznacza dane niepełne, gdy składnik nie ma wartości odżywczych", () => {
    const n = calculateRecipeNutrition(recipe("kurczak-curry-z-ryzem"), products);
    expect(n.complete).toBe(false);
    expect(n.issues).toContainEqual({ code: "missing_nutrition", productId: "przyprawa-curry" });
  });

  it("nieznany produkt i błąd przeliczenia nie przerywają obliczeń, ale są raportowane", () => {
    const broken: Recipe = {
      ...recipe("owsianka-bananowa"),
      ingredients: [
        { productId: "nie-istnieje", amount: 10, unit: "g", note: null },
        { productId: "ryz-bialy", amount: 1, unit: "szt", note: null },
        { productId: "platki-owsiane", amount: 100, unit: "g", note: null },
      ],
    };
    const n = calculateRecipeNutrition(broken, products);
    expect(n.total.kcal).toBe(372);
    expect(n.rawMassG).toBeNull();
    expect(n.issues.map((i) => i.code)).toEqual(["unknown_product", "conversion_failed"]);
    expect(n.complete).toBe(false);
  });

  it("wszystkie przepisy demo odwołują się do istniejących produktów", () => {
    for (const r of DEMO_RECIPES) {
      expect(r.source.isDemo).toBe(true);
      for (const i of r.ingredients) expect(products.has(i.productId), `${r.id}: ${i.productId}`).toBe(true);
    }
  });
});

describe("aggregateRecipeAllergens / recipeFoodGroups", () => {
  it("sumuje alergeny składników, „zawiera” wygrywa z „może zawierać”", () => {
    expect(aggregateRecipeAllergens(recipe("owsianka-bananowa"), products)).toEqual({
      ingredientsKnown: true,
      declared: { gluten: "contains", milk: "contains", peanuts: "contains", nuts: "may_contain" },
    });
  });

  it("nieznany skład dowolnego składnika = skład przepisu nieznany", () => {
    expect(aggregateRecipeAllergens(recipe("jajecznica-z-papryka"), products).ingredientsKnown).toBe(false);
  });

  it("zbiera grupy żywności", () => {
    expect(recipeFoodGroups(recipe("owsianka-bananowa"), products)).toEqual(["dairy"]);
    expect(recipeFoodGroups(recipe("tofu-z-warzywami"), products)).toEqual([]);
  });
});

describe("evaluateRecipeFit", () => {
  it("bez ograniczeń — brak konfliktu", () => {
    expect(evaluateRecipeFit(recipe("owsianka-bananowa"), products, rules()).status).toBe("no_conflict_found");
  });

  it("alergia na mleko wyklucza owsiankę", () => {
    const fit = evaluateRecipeFit(recipe("owsianka-bananowa"), products, rules({ allergens: [allergy("milk")] }));
    expect(fit.status).toBe("excluded");
    expect(fit.reasons).toContainEqual({ code: "allergen", allergen: "milk", declaration: "contains" });
    expect(fit.reasons).toContainEqual({ code: "forbidden_group", group: "dairy" });
  });

  it("dieta wegańska wyklucza owsiankę na mleku, a tofu z warzywami pasuje", () => {
    const vegan = rules({ diet: ["vegan"] });
    expect(evaluateRecipeFit(recipe("owsianka-bananowa"), products, vegan).status).toBe("excluded");
    expect(evaluateRecipeFit(recipe("tofu-z-warzywami"), products, vegan).status).toBe("no_conflict_found");
  });

  it("alergia ze śladami wyklucza „może zawierać”, nietolerancja wymaga weryfikacji", () => {
    const pasta = recipe("makaron-z-ciecierzyca");
    expect(evaluateRecipeFit(pasta, products, rules({ allergens: [allergy("eggs")] })).status).toBe("excluded");
    const intolerance = rules({ allergens: [{ code: "eggs", kind: "intolerance", excludeTraces: false }] });
    expect(evaluateRecipeFit(pasta, products, intolerance)).toEqual({
      status: "needs_verification",
      reasons: [{ code: "allergen_traces" }],
    });
  });

  it("nieznany skład składnika → wymaga weryfikacji, nawet gdy alergenu nie ma w nazwie", () => {
    const fit = evaluateRecipeFit(recipe("jajecznica-z-papryka"), products, rules({ allergens: [allergy("peanuts")] }));
    expect(fit).toEqual({ status: "needs_verification", reasons: [{ code: "allergen_data_incomplete" }] });
  });

  it("nielubiany produkt wyklucza przepis", () => {
    const fit = evaluateRecipeFit(recipe("kurczak-curry-z-ryzem"), products, rules({ disliked: ["cebula"] }));
    expect(fit.reasons).toContainEqual({ code: "custom_exclusion", label: "cebula", kind: "dislike", productName: "Cebula" });
  });

  it("własna alergia: dopasowanie w składzie wyklucza, nieznany skład wymaga weryfikacji", () => {
    expect(evaluateRecipeFit(recipe("losos-pieczony-z-ryzem"), products, rules({ otherAllergies: ["ryba"] })).status).toBe(
      "excluded",
    );
    expect(evaluateRecipeFit(recipe("owsianka-bananowa"), products, rules({ otherAllergies: ["kiwi"] })).status).toBe(
      "no_conflict_found",
    );
    expect(evaluateRecipeFit(recipe("kurczak-curry-z-ryzem"), products, rules({ otherAllergies: ["kiwi"] }))).toEqual({
      status: "needs_verification",
      reasons: [{ code: "custom_restriction_unverifiable", label: "kiwi", kind: "allergy" }],
    });
  });
});
