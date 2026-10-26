const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Czy tekst jest istniejącą datą kalendarzową YYYY-MM-DD. */
export function isIsoDate(value: string): boolean {
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

/** Liczba dni od `from` do `to` (obie YYYY-MM-DD). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** Data przesunięta o `days` dni (YYYY-MM-DD). */
export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Dzisiejsza data w Polsce (YYYY-MM-DD) — od niej liczona jest aktualność cen i promocji. */
export function todayInPoland(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(now);
}
