import { z } from "zod";
import { budgetDraftSchema, budgetSettingsSchema, type BudgetSettings } from "@/features/budget/schema";
import type { Product } from "@/features/products/types";
import { catalog } from "@/features/recipes/catalog";
import { knownStores, selectedStores, storesDraftSchema, storesSettingsSchema, type StoresSettings } from "@/features/stores/schema";
import type { Store } from "@/features/stores/stores";
import { parseDraft } from "@/lib/draft";
import { CSV_LIMITS } from "./constants";
import type { PricingContext } from "./cost";
import { todayInPoland } from "./dates";
import { DEMO_PRICES, DEMO_PROMOTIONS } from "./demo-prices";
import { importPricesCsv } from "./import";
import { combinePriceSources, createInMemoryPriceSource } from "./provider";

/** Wersje robocze z sessionStorage (niezaufane — każda walidowana od nowa). */
export interface PricingDrafts {
  stores?: string;
  budget?: string;
  priceImport?: string;
}

const str = (value: unknown) => (typeof value === "string" ? value : "");

/** Argumenty akcji serwera pochodzą z przeglądarki — zostawiamy wyłącznie pola tekstowe. */
export function sanitizeDrafts(drafts: unknown): PricingDrafts {
  const d = (drafts && typeof drafts === "object" ? drafts : {}) as Record<string, unknown>;
  return { stores: str(d.stores), budget: str(d.budget), priceImport: str(d.priceImport) };
}

/** Zaimportowany plik jest przechowywany w karcie jako surowy CSV i importowany ponownie przy użyciu. */
export const priceImportDraftSchema = z.object({
  fileName: z.string().max(200),
  csv: z.string().max(CSV_LIMITS.maxBytes),
});

export type PriceImportDraft = z.infer<typeof priceImportDraftSchema>;

/** Demo jest stałym źródłem do czasu podłączenia prawdziwych danych (etap 7 / dostawcy). */
const demoPrices = createInMemoryPriceSource(DEMO_PRICES, DEMO_PROMOTIONS, true);

export interface PricingEnvironment {
  today: string;
  stores: StoresSettings | null;
  budget: BudgetSettings | null;
  knownStores: Store[];
  selectedStores: Store[];
  products: Product[];
  importInfo: { fileName: string; prices: number; promotions: number; rejectedRows: number } | null;
  ctx: PricingContext;
}

function readImportDraft(json: string | undefined): PriceImportDraft | null {
  if (typeof json !== "string" || json === "") return null;
  try {
    const parsed = priceImportDraftSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function loadPricingEnvironment(drafts: PricingDrafts, today = todayInPoland()): Promise<PricingEnvironment> {
  const stores = parseDraft(drafts.stores ?? "", storesDraftSchema, storesSettingsSchema);
  const budget = parseDraft(drafts.budget ?? "", budgetDraftSchema, budgetSettingsSchema);
  const known = knownStores(stores);
  const selected = selectedStores(stores);
  const products = await catalog.listProducts();

  const sources = [demoPrices];
  let importInfo: PricingEnvironment["importInfo"] = null;
  const draft = readImportDraft(drafts.priceImport);
  if (draft) {
    const result = importPricesCsv(draft.csv, { products, stores: known, today });
    if (result.status === "done") {
      sources.push(createInMemoryPriceSource(result.prices, result.promotions, false));
      importInfo = {
        fileName: draft.fileName,
        prices: result.prices.length,
        promotions: result.promotions.length,
        rejectedRows: result.rejectedRows,
      };
    }
  }
  const source = combinePriceSources(sources);

  return {
    today,
    stores,
    budget,
    knownStores: known,
    selectedStores: selected,
    products,
    importInfo,
    ctx: {
      products: new Map(products.map((p) => [p.id, p])),
      prices: await source.getPrices(),
      promotions: await source.getPromotions(),
      storeIds: new Set(selected.map((s) => s.id)),
      today,
      allowEstimates: budget?.allowEstimates ?? true,
    },
  };
}
