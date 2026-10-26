import { describe, expect, it } from "vitest";
import { evaluateDietSettings, evaluateRestrictions } from "./evaluate";
import {
  DEFAULT_DIET_FORM_VALUES,
  DEFAULT_RESTRICTIONS_FORM_VALUES,
  readRestrictionsFormData,
  type DietFormValues,
  type RestrictionsFormValues,
} from "./schema";

const diet = (overrides: Partial<DietFormValues> = {}): DietFormValues => ({ ...DEFAULT_DIET_FORM_VALUES, ...overrides });
const restrictions = (overrides: Partial<RestrictionsFormValues> = {}): RestrictionsFormValues => ({
  ...DEFAULT_RESTRICTIONS_FORM_VALUES,
  ...overrides,
  allergens: { ...DEFAULT_RESTRICTIONS_FORM_VALUES.allergens, ...overrides.allergens },
});

describe("evaluateDietSettings — walidacja serwerowa", () => {
  it("przyjmuje domyślne ustawienia", () => {
    const state = evaluateDietSettings(diet());
    expect(state.status).toBe("success");
    expect(state.status === "success" && state.usedOtherDraft).toBe(false);
  });

  it("wymaga co najmniej jednego sposobu żywienia", () => {
    const state = evaluateDietSettings(diet({ dietStyles: [] }));
    expect(state.status === "invalid" && state.fieldErrors.dietStyles).toBe("Wybierz co najmniej jeden sposób żywienia.");
  });

  it("odrzuca nieznane wartości opcji", () => {
    const state = evaluateDietSettings(diet({ dietStyles: ["carnivore"], equipment: ["laser"], maxPrepMinutes: "7" }));
    expect(state.status).toBe("invalid");
    if (state.status !== "invalid") return;
    expect(Object.keys(state.fieldErrors).sort()).toEqual(["dietStyles", "equipment", "maxPrepMinutes"]);
  });

  it("sprawdza zakres liczby składników i długość pozycji listy", () => {
    const state = evaluateDietSettings(diet({ maxIngredients: "50", dislikedProducts: "a, brokuły" }));
    expect(state.status === "invalid" && state.fieldErrors).toEqual({
      maxIngredients: "Podaj wartość od 3 do 20.",
      dislikedProducts: "Każda pozycja musi mieć od 2 do 60 znaków.",
    });
  });

  it("ogranicza liczbę pozycji listy", () => {
    const many = Array.from({ length: 31 }, (_, i) => `produkt ${i}`).join(", ");
    const state = evaluateDietSettings(diet({ dislikedProducts: many }));
    expect(state.status === "invalid" && state.fieldErrors.dislikedProducts).toBe("Możesz podać maksymalnie 30 pozycji.");
  });

  it("sprzeczne sposoby żywienia zwracają status konfliktu", () => {
    const state = evaluateDietSettings(diet({ dietStyles: ["vegan", "with_meat"] }));
    expect(state.status).toBe("conflict");
  });

  it("uwzględnia alergie z wersji roboczej drugiego ekranu", () => {
    const draft = JSON.stringify(restrictions({ allergens: { ...DEFAULT_RESTRICTIONS_FORM_VALUES.allergens, fish: "allergy" } }));
    const state = evaluateDietSettings(diet({ dietStyles: ["with_fish"] }), draft);
    expect(state.status).toBe("success");
    if (state.status !== "success") return;
    expect(state.usedOtherDraft).toBe(true);
    expect(state.rules.forbiddenGroups).toEqual(["fish"]);
    expect(state.rules.conflicts[0]?.code).toBe("restriction_overrides_diet");
  });

  it("pomija zmanipulowaną wersję roboczą", () => {
    for (const draft of ["{nie json", JSON.stringify({ allergens: { fish: "deadly" } }), "[]"]) {
      const state = evaluateDietSettings(diet(), draft);
      expect(state.status === "success" && state.usedOtherDraft).toBe(false);
    }
  });
});

describe("evaluateRestrictions", () => {
  it("rozróżnia alergię i nietolerancję oraz ślady", () => {
    const state = evaluateRestrictions(
      restrictions({ allergens: { ...DEFAULT_RESTRICTIONS_FORM_VALUES.allergens, peanuts: "allergy", milk: "intolerance" } }),
    );
    expect(state.status === "success" && state.rules.allergens).toEqual([
      { code: "peanuts", kind: "allergy", excludeTraces: true },
      { code: "milk", kind: "intolerance", excludeTraces: false },
    ]);
  });

  it("bez zaznaczenia śladów alergia nie wyklucza „może zawierać”", () => {
    const state = evaluateRestrictions(
      restrictions({ avoidTraces: "", allergens: { ...DEFAULT_RESTRICTIONS_FORM_VALUES.allergens, nuts: "allergy" } }),
    );
    expect(state.status === "success" && state.rules.allergens[0]?.excludeTraces).toBe(false);
  });

  it("odrzuca nieznaną reakcję na alergen", () => {
    const state = evaluateRestrictions(
      restrictions({ allergens: { ...DEFAULT_RESTRICTIONS_FORM_VALUES.allergens, gluten: "maybe" } }),
    );
    expect(state.status === "invalid" && state.fieldErrors.allergens).toBe("Wybierz jedną z dostępnych opcji.");
  });

  it("wykrywa konflikt preferowanego produktu z dobrowolnym wykluczeniem z wersji roboczej diety", () => {
    const dietDraft = JSON.stringify(diet({ preferredProducts: "Cukier" }));
    const state = evaluateRestrictions(restrictions({ voluntaryExclusions: "cukier" }), dietDraft);
    expect(state.status === "success" && state.rules.conflicts).toEqual([
      { code: "preferred_product_excluded", severity: "resolved", product: "Cukier", kind: "voluntary" },
    ]);
  });

  it("czyta FormData — brak pola alergenu oznacza „nie dotyczy”", () => {
    const fd = new FormData();
    fd.set("allergen_sesame", "allergy");
    const values = readRestrictionsFormData(fd);
    expect(values.allergens.sesame).toBe("allergy");
    expect(values.allergens.gluten).toBe("none");
  });
});
