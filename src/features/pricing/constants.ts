/**
 * Jedyne miejsce z parametrami modułu cen. Uzasadnienia: docs/DECISIONS.md (D23–D27).
 */

/** Cena potwierdzona starsza niż tyle dni (od daty pozyskania) ma status „nieaktualna”. */
export const PRICE_STALE_AFTER_DAYS = 14;

/** Ceny jednostkowe podajemy za 1 kg / 1 l (1000 jednostek bazowych), jak na etykietach w Polsce. */
export const UNIT_PRICE_BASE_AMOUNT = 1000;

/** Waluta wszystkich cen. Inne waluty są odrzucane przy imporcie (brak przeliczania kursów). */
export const CURRENCY = "PLN";

export const PRICE_LIMITS = {
  /** Cena opakowania w groszach: 0,01 zł – 10 000 zł. */
  minGrosze: 1,
  maxGrosze: 1_000_000,
  /** Najstarsza akceptowana data pozyskania ceny (w dniach wstecz). */
  maxAgeDays: 730,
} as const;

export const CSV_LIMITS = {
  maxBytes: 200_000,
  maxRows: 2000,
  /** Ile błędów pokazujemy w raporcie (pozostałe są liczone). */
  maxReportedErrors: 100,
} as const;

/** Alternatywa jest proponowana, gdy jej cena jednostkowa jest niższa co najmniej o ten ułamek. */
export const CHEAPER_ALTERNATIVE_MIN_SAVING = 0.1;
