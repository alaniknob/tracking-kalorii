import { z } from "zod";
import { getMessages } from "@/i18n";
import { parseTextList } from "@/lib/text-list";
import { CHAIN_STORES, customStore, STORE_CHAIN_IDS, STORE_LIMITS as L, type Store } from "./stores";

const v = getMessages().validation;

export interface StoresFormValues {
  chains: string[];
  customStores: string;
}

export type StoresField = keyof StoresFormValues;

export const DEFAULT_STORES_FORM_VALUES: StoresFormValues = { chains: [], customStores: "" };

export const storesSettingsSchema = z
  .object({
    chains: z.array(z.enum(STORE_CHAIN_IDS, { error: v.option })),
    customStores: z
      .string()
      .max(600, { error: v.textTooLong(600) })
      .transform(parseTextList)
      .pipe(
        z
          .array(
            z
              .string()
              .min(L.customNameMin, { error: v.textItemLength(L.customNameMin, L.customNameMax) })
              .max(L.customNameMax, { error: v.textItemLength(L.customNameMin, L.customNameMax) }),
          )
          .max(L.maxCustomStores, { error: v.textListMax(L.maxCustomStores) }),
      ),
  })
  .superRefine((value, ctx) => {
    if (value.chains.length === 0 && value.customStores.length === 0) {
      ctx.addIssue({ code: "custom", path: ["chains"], message: v.storesRequired });
    }
    const chainNames = new Set(CHAIN_STORES.map((s) => s.id));
    const ids = new Set<string>();
    for (const name of value.customStores) {
      const id = customStore(name).id;
      if (chainNames.has(id.replace(/^inny-/, "")) || ids.has(id)) {
        ctx.addIssue({ code: "custom", path: ["customStores"], message: v.storeDuplicate(name) });
      }
      ids.add(id);
    }
  });

export type StoresSettings = z.output<typeof storesSettingsSchema>;

export const storesDraftSchema = z.object({ chains: z.array(z.string()), customStores: z.string() });

export function readStoresFormData(formData: FormData): StoresFormValues {
  const customStores = formData.get("customStores");
  return {
    chains: formData.getAll("chains").filter((x): x is string => typeof x === "string"),
    customStores: typeof customStores === "string" ? customStores : "",
  };
}

/** Wszystkie sklepy znane aplikacji dla tego użytkownika: sieci z konfiguracji + własne. */
export function knownStores(settings: StoresSettings | null): Store[] {
  return [...CHAIN_STORES, ...(settings?.customStores.map(customStore) ?? [])];
}

/** Sklepy wybrane przez użytkownika; bez ustawień — wszystkie sieci z konfiguracji. */
export function selectedStores(settings: StoresSettings | null): Store[] {
  if (!settings) return CHAIN_STORES;
  return [...CHAIN_STORES.filter((s) => settings.chains.includes(s.id as never)), ...settings.customStores.map(customStore)];
}
