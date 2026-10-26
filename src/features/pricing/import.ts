import { QUANTITY_UNITS, type Product, type QuantityUnit } from "@/features/products/types";
import { toBaseAmount } from "@/features/products/quantity";
import { findStore, type Store } from "@/features/stores/stores";
import { getMessages } from "@/i18n";
import { normalizeLabel } from "@/lib/text-list";
import { CSV_LIMITS, PRICE_LIMITS } from "./constants";
import { parseCsv } from "./csv";
import { daysBetween, isIsoDate } from "./dates";
import { parsePlnToGrosze } from "./money";
import type { PriceSource, Promotion, StorePrice } from "./types";

export const CSV_COLUMNS = {
  required: ["produkt", "sklep", "cena", "opakowanie", "jednostka", "data", "zrodlo"],
  optional: ["szacunkowa", "promocja_od", "promocja_do", "warunki", "waluta", "url"],
} as const;

type Column = (typeof CSV_COLUMNS.required)[number] | (typeof CSV_COLUMNS.optional)[number];

export interface ImportRowError {
  line: number;
  column: Column | null;
  message: string;
}

export type ImportResult =
  | { status: "file_error"; message: string }
  | {
      status: "done";
      rowCount: number;
      prices: StorePrice[];
      promotions: Promotion[];
      /** Pierwsze `CSV_LIMITS.maxReportedErrors` błędów; pełna liczba w `errorCount`. */
      errors: ImportRowError[];
      errorCount: number;
      /** Liczba wierszy odrzuconych (wiersz może mieć kilka błędów). */
      rejectedRows: number;
    };

export interface ImportContext {
  products: readonly Product[];
  stores: readonly Store[];
  today: string;
}

/** „Źródło” → „zrodlo”, „Promocja od” → „promocja_od”. */
function normalizeHeader(value: string): string {
  return normalizeLabel(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("ł", "l")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** YYYY-MM-DD lub DD.MM.YYYY → YYYY-MM-DD; `null` dla niepoprawnej daty. */
export function parseDate(value: string): string | null {
  const pl = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(value);
  const iso = pl ? `${pl[3]}-${pl[2].padStart(2, "0")}-${pl[1].padStart(2, "0")}` : value;
  return isIsoDate(iso) ? iso : null;
}

function parseAmount(value: string): number | null {
  const normalized = value.replace(",", ".");
  if (!/^\d+(\.\d{1,3})?$/.test(normalized)) return null;
  const n = Number(normalized);
  return n > 0 ? n : null;
}

const YES = new Set(["tak", "t", "1", "true", "yes"]);
const NO = new Set(["", "nie", "n", "0", "false", "no"]);

/**
 * Import cen z CSV. Każdy wiersz jest walidowany niezależnie; poprawne wiersze są przyjmowane,
 * błędne trafiają do raportu z numerem linii i kolumną. Nic nie jest zgadywane ani uzupełniane.
 */
export function importPricesCsv(text: string, ctx: ImportContext): ImportResult {
  const m = getMessages().pricing.import.errors;
  if (new TextEncoder().encode(text).length > CSV_LIMITS.maxBytes) {
    return { status: "file_error", message: m.tooLarge(Math.round(CSV_LIMITS.maxBytes / 1000)) };
  }
  const parsed = parseCsv(text);
  if (!parsed.ok) {
    return { status: "file_error", message: parsed.error === "empty" ? m.empty : m.unterminatedQuote(parsed.line ?? 1) };
  }
  if (parsed.rows.length > CSV_LIMITS.maxRows) return { status: "file_error", message: m.tooManyRows(CSV_LIMITS.maxRows) };

  const header = parsed.header.map(normalizeHeader);
  const missing = CSV_COLUMNS.required.filter((c) => !header.includes(c));
  if (missing.length > 0) return { status: "file_error", message: m.missingColumns(missing.join(", ")) };
  const known = new Set<string>([...CSV_COLUMNS.required, ...CSV_COLUMNS.optional]);
  const unknown = header.filter((h) => h !== "" && !known.has(h));
  if (unknown.length > 0) return { status: "file_error", message: m.unknownColumns(unknown.join(", ")) };
  if (parsed.rows.length === 0) return { status: "file_error", message: m.noRows };

  const productsByKey = new Map<string, Product>();
  for (const p of ctx.products) {
    productsByKey.set(p.id, p);
    productsByKey.set(normalizeLabel(p.name), p);
  }

  const errors: ImportRowError[] = [];
  let errorCount = 0;
  let rejectedRows = 0;
  const prices: StorePrice[] = [];
  const promotions: Promotion[] = [];
  const seen = new Set<string>();

  for (const row of parsed.rows) {
    const rowErrors: ImportRowError[] = [];
    const fail = (column: Column | null, message: string) => rowErrors.push({ line: row.line, column, message });
    const get = (column: Column) => {
      const index = header.indexOf(column);
      return index === -1 ? "" : (row.cells[index] ?? "");
    };

    if (row.cells.length > header.length) fail(null, m.tooManyCells(header.length, row.cells.length));

    const product = productsByKey.get(normalizeLabel(get("produkt")));
    if (get("produkt") === "") fail("produkt", m.required);
    else if (!product) fail("produkt", m.unknownProduct(get("produkt")));

    const store = get("sklep") === "" ? undefined : findStore(ctx.stores, get("sklep"));
    if (get("sklep") === "") fail("sklep", m.required);
    else if (!store) fail("sklep", m.unknownStore(get("sklep")));

    const currency = get("waluta").toUpperCase();
    if (currency !== "" && currency !== "PLN") fail("waluta", m.currency);

    const priceGrosze = parsePlnToGrosze(get("cena"));
    if (get("cena") === "") fail("cena", m.required);
    else if (priceGrosze === null) fail("cena", m.priceFormat);
    else if (priceGrosze < PRICE_LIMITS.minGrosze || priceGrosze > PRICE_LIMITS.maxGrosze) {
      fail("cena", m.priceRange(PRICE_LIMITS.maxGrosze / 100));
    }

    const amount = parseAmount(get("opakowanie"));
    if (get("opakowanie") === "") fail("opakowanie", m.required);
    else if (amount === null) fail("opakowanie", m.amount);

    const unitRaw = normalizeLabel(get("jednostka")).replace(/\.$/, "");
    const unit = (QUANTITY_UNITS as readonly string[]).includes(unitRaw) ? (unitRaw as QuantityUnit) : null;
    if (unitRaw === "") fail("jednostka", m.required);
    else if (!unit) fail("jednostka", m.unit(QUANTITY_UNITS.join(", ")));
    else if (product && amount !== null) {
      const base = toBaseAmount(amount, unit, product);
      if (!base.ok) fail("jednostka", m.unitIncompatible(unit, product.name));
    }

    const observedOn = parseDate(get("data"));
    if (get("data") === "") fail("data", m.required);
    else if (!observedOn) fail("data", m.date);
    else if (observedOn > ctx.today) fail("data", m.futureDate);
    else if (daysBetween(observedOn, ctx.today) > PRICE_LIMITS.maxAgeDays) fail("data", m.tooOld(PRICE_LIMITS.maxAgeDays));

    const estimateRaw = normalizeLabel(get("szacunkowa"));
    const isEstimate = YES.has(estimateRaw);
    if (!isEstimate && !NO.has(estimateRaw)) fail("szacunkowa", m.yesNo);

    const sourceName = get("zrodlo");
    if (sourceName.length < 2) fail("zrodlo", m.source);
    const url = get("url");
    if (url !== "" && !/^https?:\/\/\S+$/i.test(url)) fail("url", m.url);

    const promoFromRaw = get("promocja_od");
    const promoToRaw = get("promocja_do");
    const isPromotion = promoFromRaw !== "" || promoToRaw !== "";
    const promoFrom = parseDate(promoFromRaw);
    const promoTo = parseDate(promoToRaw);
    const conditions = get("warunki");
    if (isPromotion) {
      if (!promoFrom) fail("promocja_od", promoFromRaw === "" ? m.promoBothDates : m.date);
      if (!promoTo) fail("promocja_do", promoToRaw === "" ? m.promoBothDates : m.date);
      if (promoFrom && promoTo && promoTo < promoFrom) fail("promocja_do", m.promoOrder);
      if (isEstimate) fail("szacunkowa", m.promoEstimate);
    } else if (conditions !== "") {
      fail("warunki", m.conditionsWithoutPromo);
    }

    if (rowErrors.length === 0) {
      const key = [product!.id, store!.id, amount, unit, observedOn, isEstimate, promoFrom ?? "", promoTo ?? ""].join("|");
      if (seen.has(key)) fail(null, m.duplicate);
      seen.add(key);
    }

    if (rowErrors.length > 0) {
      rejectedRows++;
      errorCount += rowErrors.length;
      errors.push(...rowErrors.slice(0, Math.max(0, CSV_LIMITS.maxReportedErrors - errors.length)));
      continue;
    }

    const source: PriceSource = { kind: "csv_import", name: sourceName, url: url || null, isDemo: false };
    const common = {
      id: `import-${row.line}`,
      productId: product!.id,
      storeId: store!.id,
      currency: "PLN" as const,
      packageAmount: amount!,
      packageUnit: unit!,
      source,
    };
    if (isPromotion) {
      promotions.push({
        ...common,
        promoPriceGrosze: priceGrosze!,
        startsOn: promoFrom!,
        endsOn: promoTo!,
        conditions: conditions || null,
      });
    } else {
      prices.push({ ...common, priceGrosze: priceGrosze!, observedOn: observedOn!, isEstimate });
    }
  }

  return { status: "done", rowCount: parsed.rows.length, prices, promotions, errors, errorCount, rejectedRows };
}
