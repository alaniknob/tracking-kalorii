import { DEFAULT_LOCALE, type Locale } from "./config";
import { pl, type Messages } from "./messages/pl";

const dictionaries: Record<Locale, Messages> = { "pl-PL": pl };

export function getMessages(locale: Locale = DEFAULT_LOCALE): Messages {
  return dictionaries[locale];
}

export { DEFAULT_LOCALE, type Locale } from "./config";
export type { Messages } from "./messages/pl";
export * from "./format";
