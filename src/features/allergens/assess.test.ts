import { describe, expect, it } from "vitest";
import { assessAllergens } from "./assess";
import { EU_ALLERGENS, type AllergenExclusion } from "./eu-allergens";

const milkAllergy: AllergenExclusion = { code: "milk", kind: "allergy", excludeTraces: true };
const milkIntolerance: AllergenExclusion = { code: "milk", kind: "intolerance", excludeTraces: false };

describe("EU_ALLERGENS", () => {
  it("zawiera dokładnie 14 alergenów z rozporządzenia 1169/2011", () => {
    expect(EU_ALLERGENS).toHaveLength(14);
    expect(new Set(EU_ALLERGENS).size).toBe(14);
  });
});

describe("assessAllergens", () => {
  it("wyklucza produkt zawierający alergen", () => {
    const result = assessAllergens({ ingredientsKnown: true, declared: { milk: "contains" } }, [milkIntolerance]);
    expect(result).toEqual({ status: "excluded", matches: [{ code: "milk", declaration: "contains" }] });
  });

  it("przy alergii wyklucza także „może zawierać”", () => {
    const result = assessAllergens({ ingredientsKnown: true, declared: { milk: "may_contain" } }, [milkAllergy]);
    expect(result.status).toBe("excluded");
  });

  it("przy nietolerancji „może zawierać” wymaga weryfikacji, a nie jest uznane za bezpieczne", () => {
    const result = assessAllergens({ ingredientsKnown: true, declared: { milk: "may_contain" } }, [milkIntolerance]);
    expect(result).toEqual({ status: "needs_verification", reasons: ["traces_declared"] });
  });

  it("brak alergenu w danych przy nieznanym składzie → wymaga weryfikacji", () => {
    const result = assessAllergens({ ingredientsKnown: false, declared: {} }, [milkAllergy]);
    expect(result).toEqual({ status: "needs_verification", reasons: ["missing_ingredients"] });
  });

  it("znany skład bez zadeklarowanych alergenów → brak zadeklarowanego konfliktu", () => {
    const result = assessAllergens({ ingredientsKnown: true, declared: { gluten: "contains" } }, [milkAllergy]);
    expect(result).toEqual({ status: "no_declared_conflict" });
  });

  it("bez wykluczeń użytkownika nie ocenia składu", () => {
    expect(assessAllergens({ ingredientsKnown: false, declared: {} }, [])).toEqual({ status: "no_declared_conflict" });
  });
});
