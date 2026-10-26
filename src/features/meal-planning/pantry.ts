import { z } from "zod";
import { toBaseAmount } from "@/features/products/quantity";
import { QUANTITY_UNITS, type Product, type QuantityUnit } from "@/features/products/types";
import { getMessages } from "@/i18n";
import { PANTRY_LIMITS } from "./constants";

/** Pozycja zapasów w formularzu (surowe wartości). */
export interface PantryRow {
  productId: string;
  amount: string;
  unit: string;
}

/** Kształt wersji roboczej zapasów z sessionStorage (niezaufane). */
export const pantryDraftSchema = z.array(z.object({ productId: z.string(), amount: z.string(), unit: z.string() })).max(PANTRY_LIMITS.maxItems);

export interface PantryItem {
  productId: string;
  amount: number;
  unit: QuantityUnit;
  /** Ilość w jednostce bazowej produktu (g lub ml). */
  baseAmount: number;
}

export type PantryResult =
  | { ok: true; items: PantryItem[] }
  | { ok: false; errors: { row: number; message: string }[] };

/** Jednostki, w których można podać zapas produktu (zależnie od jednostki bazowej, masy sztuki i gęstości). */
export function pantryUnitsFor(product: Pick<Product, "baseUnit" | "gramsPerPiece" | "densityGPerMl">): QuantityUnit[] {
  const units: QuantityUnit[] = product.baseUnit === "g" ? ["g", "kg"] : ["ml", "l"];
  if (product.densityGPerMl !== null) units.push(...(product.baseUnit === "g" ? (["ml", "l"] as const) : (["g", "kg"] as const)));
  if (product.gramsPerPiece !== null) units.push("szt");
  return units;
}

/**
 * Walidacja zapasów: znany produkt, liczba > 0, jednostka przeliczalna, bez duplikatów produktu.
 * Puste wiersze (bez produktu i ilości) są pomijane.
 */
export function validatePantry(rows: readonly PantryRow[], products: ReadonlyMap<string, Product>): PantryResult {
  const m = getMessages().planner.pantry.errors;
  if (rows.length > PANTRY_LIMITS.maxItems) return { ok: false, errors: [{ row: 0, message: m.tooMany(PANTRY_LIMITS.maxItems) }] };

  const errors: { row: number; message: string }[] = [];
  const items: PantryItem[] = [];
  const seen = new Set<string>();
  for (const [i, row] of rows.entries()) {
    const line = i + 1;
    const rawAmount = row.amount.trim().replace(",", ".");
    if (row.productId === "" && rawAmount === "") continue;
    const product = products.get(row.productId);
    const fail = (message: string) => errors.push({ row: line, message });
    if (!product) {
      fail(m.product);
      continue;
    }
    if (seen.has(product.id)) {
      fail(m.duplicate(product.name));
      continue;
    }
    const amount = Number(rawAmount);
    if (rawAmount === "" || !Number.isFinite(amount) || amount <= 0 || amount > PANTRY_LIMITS.maxAmount) {
      fail(m.amount);
      continue;
    }
    const unit = (QUANTITY_UNITS as readonly string[]).includes(row.unit) ? (row.unit as QuantityUnit) : null;
    const base = unit && pantryUnitsFor(product).includes(unit) ? toBaseAmount(amount, unit, product) : null;
    if (!unit || !base?.ok) {
      fail(m.unit(product.name));
      continue;
    }
    seen.add(product.id);
    items.push({ productId: product.id, amount, unit, baseAmount: base.value });
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, items };
}

/** Wersja robocza zapasów — błędna w całości jest pomijana (formularz pokaże błędy przy zapisie). */
export function parsePantryDraft(json: string, products: ReadonlyMap<string, Product>): PantryItem[] {
  if (json.trim() === "") return [];
  try {
    const raw = pantryDraftSchema.safeParse(JSON.parse(json));
    if (!raw.success) return [];
    const result = validatePantry(raw.data, products);
    return result.ok ? result.items : [];
  } catch {
    return [];
  }
}
