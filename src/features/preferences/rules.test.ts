import { describe, expect, it } from "vitest";
import { resolveFoodRules, type DietRulesInput, type RestrictionsInput } from "./rules";

const diet = (overrides: Partial<DietRulesInput> = {}): DietRulesInput => ({
  dietStyles: ["traditional"],
  dislikedProducts: [],
  preferredProducts: [],
  ...overrides,
});

const restrictions = (overrides: Partial<RestrictionsInput> = {}): RestrictionsInput => ({
  allergens: [],
  otherAllergies: [],
  otherIntolerances: [],
  voluntaryExclusions: [],
  ...overrides,
});

describe("resolveFoodRules — sposoby żywienia", () => {
  it("dieta tradycyjna nie wyklucza żadnej grupy", () => {
    const rules = resolveFoodRules(diet(), null);
    expect(rules.forbiddenGroups).toEqual([]);
    expect(rules.conflicts).toEqual([]);
  });

  it("wegańska wyklucza mięso, ryby, owoce morza, jaja, nabiał i miód", () => {
    expect(resolveFoodRules(diet({ dietStyles: ["vegan"] }), null).forbiddenGroups).toEqual([
      "meat",
      "fish",
      "seafood",
      "eggs",
      "dairy",
      "honey",
    ]);
  });

  it("łączy sposoby żywienia (bezmięsna + z rybami = dieta pescowegetariańska)", () => {
    const rules = resolveFoodRules(diet({ dietStyles: ["meatless", "with_fish"] }), null);
    expect(rules.forbiddenGroups).toEqual(["meat"]);
    expect(rules.requiredGroups).toEqual(["fish"]);
    expect(rules.hasBlockingConflict).toBe(false);
  });

  it("łączenie zgodnych reguł nie tworzy konfliktu (wegańska + wegetariańska + bez ryb)", () => {
    const rules = resolveFoodRules(diet({ dietStyles: ["vegan", "vegetarian", "no_fish"] }), null);
    expect(rules.conflicts).toEqual([]);
  });

  it.each([
    [["vegan", "with_fish"], "fish", "vegan"],
    [["vegetarian", "with_meat"], "meat", "vegetarian"],
    [["no_fish", "with_fish"], "fish", "no_fish"],
    [["meatless", "with_meat"], "meat", "meatless"],
  ] as const)("wykrywa sprzeczność %j", (styles, group, forbiddenBy) => {
    const rules = resolveFoodRules(diet({ dietStyles: [...styles] }), null);
    expect(rules.hasBlockingConflict).toBe(true);
    expect(rules.conflicts[0]).toMatchObject({ code: "diet_contradiction", group, forbiddenBy });
    expect(rules.requiredGroups).not.toContain(group);
    expect(rules.forbiddenGroups).toContain(group);
  });
});

describe("resolveFoodRules — alergie mają pierwszeństwo", () => {
  it("alergia na ryby wygrywa z „z rybami” i wyklucza ryby", () => {
    const rules = resolveFoodRules(
      diet({ dietStyles: ["with_fish"] }),
      restrictions({ allergens: [{ code: "fish", kind: "allergy", excludeTraces: true }] }),
    );
    expect(rules.forbiddenGroups).toEqual(["fish"]);
    expect(rules.requiredGroups).toEqual([]);
    expect(rules.hasBlockingConflict).toBe(false);
    expect(rules.conflicts).toEqual([
      {
        code: "restriction_overrides_diet",
        severity: "resolved",
        group: "fish",
        requiredBy: "with_fish",
        allergen: "fish",
        kind: "allergy",
      },
    ]);
  });

  it("nietolerancja mleka wyklucza nabiał", () => {
    const rules = resolveFoodRules(null, restrictions({ allergens: [{ code: "milk", kind: "intolerance", excludeTraces: false }] }));
    expect(rules.forbiddenGroups).toEqual(["dairy"]);
  });

  it("alergeny bez grupy (np. gluten) pozostają jako wykluczenia alergenów", () => {
    const allergen = { code: "gluten", kind: "allergy", excludeTraces: true } as const;
    const rules = resolveFoodRules(null, restrictions({ allergens: [allergen] }));
    expect(rules.forbiddenGroups).toEqual([]);
    expect(rules.allergens).toEqual([allergen]);
  });

  it("preferowany produkt wykluczony przez alergię zostaje usunięty z preferowanych", () => {
    const rules = resolveFoodRules(
      diet({ preferredProducts: ["Kiwi", "Owsianka"] }),
      restrictions({ otherAllergies: ["kiwi"] }),
    );
    expect(rules.preferredProducts).toEqual(["Owsianka"]);
    expect(rules.conflicts).toEqual([
      { code: "preferred_product_excluded", severity: "resolved", product: "Kiwi", kind: "allergy" },
    ]);
  });

  it("ten sam produkt lubiany i nielubiany to sprzeczność do poprawienia", () => {
    const rules = resolveFoodRules(diet({ preferredProducts: ["Brokuły"], dislikedProducts: ["brokuły"] }), null);
    expect(rules.hasBlockingConflict).toBe(true);
    expect(rules.conflicts[0]).toMatchObject({ code: "product_preferred_and_disliked", product: "Brokuły" });
  });

  it("rozróżnia rodzaje własnych wykluczeń", () => {
    const rules = resolveFoodRules(
      diet({ dislikedProducts: ["seler naciowy"] }),
      restrictions({ otherAllergies: ["kiwi"], otherIntolerances: ["fruktoza"], voluntaryExclusions: ["cukier"] }),
    );
    expect(rules.customExclusions).toEqual([
      { label: "kiwi", kind: "allergy" },
      { label: "fruktoza", kind: "intolerance" },
      { label: "cukier", kind: "voluntary" },
      { label: "seler naciowy", kind: "dislike" },
    ]);
  });
});
