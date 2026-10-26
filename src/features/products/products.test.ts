import { describe, expect, it } from "vitest";
import { dataCompleteness, isEnergyConsistent } from "./completeness";
import { DEMO_PRODUCTS } from "./demo-products";
import { packagesNeeded, toBaseAmount, toGrams } from "./quantity";
import { productSchema } from "./schema";
import type { Product } from "./types";

const byId = (id: string) => DEMO_PRODUCTS.find((p) => p.id === id)!;

describe("toBaseAmount / toGrams", () => {
  it("przelicza kg na g i l na ml", () => {
    expect(toBaseAmount(1.5, "kg", byId("ryz-bialy"))).toEqual({ ok: true, value: 1500 });
    expect(toBaseAmount(0.5, "l", byId("mleko-2"))).toEqual({ ok: true, value: 500 });
  });

  it("przelicza sztuki przez masę sztuki", () => {
    expect(toBaseAmount(3, "szt", byId("jaja"))).toEqual({ ok: true, value: 150 });
  });

  it("bez masy sztuki zwraca błąd zamiast zgadywać", () => {
    expect(toBaseAmount(1, "szt", byId("ryz-bialy"))).toEqual({ ok: false, error: "missing_piece_weight" });
  });

  it("masa ↔ objętość wymaga gęstości", () => {
    const oil = byId("olej-rzepakowy");
    expect(toBaseAmount(92, "g", oil)).toEqual({ ok: true, value: 100 });
    expect(toGrams(100, "ml", oil)).toEqual({ ok: true, value: 92 });
    expect(toBaseAmount(100, "ml", byId("ryz-bialy"))).toEqual({ ok: false, error: "missing_density" });
  });

  it("odrzuca ilości niedodatnie i nieskończone", () => {
    expect(toBaseAmount(0, "g", byId("ryz-bialy")).ok).toBe(false);
    expect(toBaseAmount(Number.NaN, "g", byId("ryz-bialy")).ok).toBe(false);
  });
});

describe("packagesNeeded", () => {
  it("zaokrągla w górę do pełnych opakowań", () => {
    expect(packagesNeeded(150, 500)).toBe(1);
    expect(packagesNeeded(500, 500)).toBe(1);
    expect(packagesNeeded(501, 500)).toBe(2);
    expect(packagesNeeded(0.1 + 0.2, 0.3)).toBe(1);
  });
});

describe("dataCompleteness / isEnergyConsistent", () => {
  it("wylicza kompletność z danych", () => {
    expect(dataCompleteness(byId("ryz-bialy"))).toBe("complete");
    expect(dataCompleteness(byId("chleb-zytni"))).toBe("partial");
    expect(dataCompleteness(byId("przyprawa-curry"))).toBe("minimal");
  });

  it("wykrywa energię niezgodną z makroskładnikami", () => {
    expect(isEnergyConsistent({ kcal: 50, proteinG: 3.3, fatG: 2, carbohydratesG: 4.8, fiberG: 0 })).toBe(true);
    expect(isEnergyConsistent({ kcal: 500, proteinG: 3.3, fatG: 2, carbohydratesG: 4.8, fiberG: 0 })).toBe(false);
  });
});

describe("katalog demo", () => {
  it.each(DEMO_PRODUCTS.map((p) => [p.id, p] as const))("%s przechodzi walidację katalogu", (_id, product) => {
    const result = productSchema.safeParse(product);
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
  });

  it("wszystkie produkty demo są oznaczone jako przykładowe i mają unikalne id", () => {
    expect(DEMO_PRODUCTS.every((p) => p.source.isDemo)).toBe(true);
    expect(new Set(DEMO_PRODUCTS.map((p) => p.id)).size).toBe(DEMO_PRODUCTS.length);
  });

  it("schemat odrzuca błędne dane (energia, suma makro, skład)", () => {
    const valid = byId("ryz-bialy");
    const bad = (patch: Partial<Product>) => productSchema.safeParse({ ...valid, ...patch }).success;
    expect(bad({ nutrition: { ...valid.nutrition!, kcal: 50 } })).toBe(false);
    expect(bad({ nutrition: { kcal: 400, proteinG: 60, fatG: 0, carbohydratesG: 60, fiberG: 0 } })).toBe(false);
    expect(bad({ ingredientsText: null })).toBe(false);
  });
});
