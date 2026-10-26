import { normalizeLabel } from "@/lib/text-list";

export type StoreKind = "chain" | "custom";

export interface Store {
  id: string;
  name: string;
  kind: StoreKind;
}

/**
 * Konfigurowalna lista sieci. Dodanie sieci = nowy wpis tutaj + nowa migracja z wierszem
 * w `public.stores` (test pilnuje zgodności). Nazwa sieci nie oznacza dostępu do jej danych —
 * nie korzystamy z żadnych API ani scrapingu sklepów.
 */
export const STORE_CHAINS = [
  { id: "lidl", name: "Lidl" },
  { id: "biedronka", name: "Biedronka" },
  { id: "kaufland", name: "Kaufland" },
  { id: "aldi", name: "Aldi" },
  { id: "carrefour", name: "Carrefour" },
  { id: "auchan", name: "Auchan" },
  { id: "dino", name: "Dino" },
  { id: "netto", name: "Netto" },
  { id: "stokrotka", name: "Stokrotka" },
] as const satisfies readonly { id: string; name: string }[];

export type StoreChainId = (typeof STORE_CHAINS)[number]["id"];

export const STORE_CHAIN_IDS = STORE_CHAINS.map((s) => s.id) as [StoreChainId, ...StoreChainId[]];

export const CHAIN_STORES: Store[] = STORE_CHAINS.map((s) => ({ ...s, kind: "chain" }));

export const STORE_LIMITS = { maxCustomStores: 10, customNameMin: 2, customNameMax: 40 } as const;

const CUSTOM_PREFIX = "inny-";

/** Stabilny identyfikator sklepu dodanego przez użytkownika (np. „Targ na Kleparzu” → `inny-targ-na-kleparzu`). */
export function customStoreId(name: string): string {
  const slug = normalizeLabel(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("ł", "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${CUSTOM_PREFIX}${slug || "sklep"}`;
}

export function customStore(name: string): Store {
  return { id: customStoreId(name), name: name.trim(), kind: "custom" };
}

/** Wyszukanie sklepu po identyfikatorze lub nazwie (bez rozróżniania wielkości liter). */
export function findStore(stores: readonly Store[], idOrName: string): Store | undefined {
  const key = normalizeLabel(idOrName);
  return stores.find((s) => s.id === key || normalizeLabel(s.name) === key);
}
