import { DEFAULT_LOCALE, type Locale } from "./config";

export function formatNumber(value: number, locale: Locale = DEFAULT_LOCALE, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);
}

export function formatKcal(value: number, locale: Locale = DEFAULT_LOCALE): string {
  return `${formatNumber(value, locale)} kcal`;
}

export function formatGrams(value: number, locale: Locale = DEFAULT_LOCALE): string {
  return `${formatNumber(value, locale)} g`;
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
