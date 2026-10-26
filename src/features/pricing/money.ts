import type { Grosze } from "./types";

/**
 * „4,99”, „4.99”, „12”, „1 299,00” → grosze. Zwraca `null` dla wartości niepoprawnych
 * (więcej niż 2 miejsca po przecinku, litery, ujemne).
 */
export function parsePlnToGrosze(input: string): Grosze | null {
  const value = input.trim().replace(/\s|\u00a0/g, "").replace(/zł$/i, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export const groszeToPln = (grosze: Grosze): number => grosze / 100;

/** Część kwoty proporcjonalna do zużycia (np. 150 g z opakowania 500 g), zaokrąglona do grosza. */
export function proportionalGrosze(total: Grosze, used: number, of: number): Grosze {
  if (of <= 0) throw new Error("`of` must be positive");
  return Math.round((total * used) / of);
}
