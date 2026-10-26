export const SUPPORTED_LOCALES = ["pl-PL"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "pl-PL";
