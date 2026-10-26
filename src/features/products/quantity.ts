import type { Product, QuantityUnit } from "./types";

export type ConversionError = "missing_piece_weight" | "missing_density" | "invalid_amount";

export type ConversionResult = { ok: true; value: number } | { ok: false; error: ConversionError };

const fail = (error: ConversionError): ConversionResult => ({ ok: false, error });

/**
 * Przelicza ilość na jednostkę bazową produktu (g lub ml), w której podane są wartości odżywcze.
 * Masa ↔ objętość wymaga gęstości; sztuki wymagają masy sztuki. Bez danych — błąd, nie zgadywanie.
 */
export function toBaseAmount(amount: number, unit: QuantityUnit, product: Product): ConversionResult {
  if (!Number.isFinite(amount) || amount <= 0) return fail("invalid_amount");

  let grams: number | null = null;
  let millilitres: number | null = null;
  switch (unit) {
    case "g":
      grams = amount;
      break;
    case "kg":
      grams = amount * 1000;
      break;
    case "ml":
      millilitres = amount;
      break;
    case "l":
      millilitres = amount * 1000;
      break;
    case "szt":
      if (product.gramsPerPiece === null) return fail("missing_piece_weight");
      grams = amount * product.gramsPerPiece;
      break;
  }

  if (product.baseUnit === "g") {
    if (grams !== null) return { ok: true, value: grams };
    if (product.densityGPerMl === null) return fail("missing_density");
    return { ok: true, value: millilitres! * product.densityGPerMl };
  }
  if (millilitres !== null) return { ok: true, value: millilitres };
  if (product.densityGPerMl === null) return fail("missing_density");
  return { ok: true, value: grams! / product.densityGPerMl };
}

/** Masa w gramach (np. do sumowania masy przepisu). */
export function toGrams(amount: number, unit: QuantityUnit, product: Product): ConversionResult {
  const base = toBaseAmount(amount, unit, product);
  if (!base.ok || product.baseUnit === "g") return base;
  if (product.densityGPerMl === null) return fail("missing_density");
  return { ok: true, value: base.value * product.densityGPerMl };
}

/** Liczba pełnych opakowań potrzebnych do pokrycia ilości (w jednostce bazowej). */
export function packagesNeeded(baseAmount: number, packageSize: number): number {
  if (packageSize <= 0) throw new Error("packageSize must be positive");
  return Math.ceil(baseAmount / packageSize - 1e-9);
}
