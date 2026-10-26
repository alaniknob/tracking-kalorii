import { DEFAULT_LOCALE, type Locale } from "./config";

export function formatNumber(value: number, locale: Locale = DEFAULT_LOCALE, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);
}

export function formatKcal(value: number, locale: Locale = DEFAULT_LOCALE): string {
  return `${formatNumber(value, locale)} kcal`;
}

export function formatGrams(value: number, locale: Locale = DEFAULT_LOCALE, maximumFractionDigits = 0): string {
  return `${formatNumber(value, locale, maximumFractionDigits)} g`;
}

export function formatPercent(fraction: number, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(fraction);
}

export function formatCurrency(value: number, locale: Locale = DEFAULT_LOCALE, currency = "PLN"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
}

export function formatDate(date: Date, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(date);
}

/** Kwota w groszach (liczba całkowita) jako PLN. */
export function formatGrosze(grosze: number, locale: Locale = DEFAULT_LOCALE): string {
  return formatCurrency(grosze / 100, locale);
}

/** Data kalendarzowa YYYY-MM-DD (bez przesunięć strefy czasowej). */
export function formatIsoDate(iso: string, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

/** Dzień tygodnia i data, np. „poniedziałek, 26 paź”. */
export function formatWeekdayDate(iso: string, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}
