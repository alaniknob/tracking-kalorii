"use server";

import { knownStores, storesDraftSchema, storesSettingsSchema } from "@/features/stores/schema";
import { catalog, recipeProductIds } from "@/features/recipes/catalog";
import { recipeNeeds } from "@/features/recipes/cost";
import { getMessages } from "@/i18n";
import { parseDraft } from "@/lib/draft";
import { CSV_LIMITS } from "./constants";
import { costNeeds, type BasketCost } from "./cost";
import { todayInPoland } from "./dates";
import { loadPricingEnvironment, sanitizeDrafts, type PricingDrafts } from "./environment";
import { importPricesCsv, type ImportRowError } from "./import";
import { namesFor, type NameMaps } from "./names";
import { productOffers, type Offer } from "./offers";
import type { Promotion } from "./types";

export type ImportFormState =
  | { status: "idle" }
  | { status: "file_error"; message: string }
  | {
      status: "done";
      fileName: string;
      /** Treść pliku do zapisania w karcie — tylko gdy przyjęto co najmniej jeden wiersz. */
      csv: string | null;
      rowCount: number;
      importedPrices: number;
      importedPromotions: number;
      rejectedRows: number;
      errorCount: number;
      errors: ImportRowError[];
    };

/** Import pliku CSV z cenami. Plik nie jest zapisywany na serwerze — wraca do karty przeglądarki. */
export async function importPricesAction(_prev: ImportFormState, formData: FormData): Promise<ImportFormState> {
  const m = getMessages().pricing.import.errors;
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { status: "file_error", message: m.noFile };
  if (file.size > CSV_LIMITS.maxBytes) {
    return { status: "file_error", message: m.tooLarge(Math.round(CSV_LIMITS.maxBytes / 1000)) };
  }
  if (!/\.(csv|txt)$/i.test(file.name)) return { status: "file_error", message: m.fileType };

  const storesDraft = formData.get("storesDraft");
  const stores = parseDraft(typeof storesDraft === "string" ? storesDraft : "", storesDraftSchema, storesSettingsSchema);
  const text = await file.text();
  const result = importPricesCsv(text, {
    products: await catalog.listProducts(),
    stores: knownStores(stores),
    today: todayInPoland(),
  });
  if (result.status === "file_error") return result;

  const imported = result.prices.length + result.promotions.length;
  return {
    status: "done",
    fileName: file.name.slice(0, 200),
    csv: imported > 0 ? text : null,
    rowCount: result.rowCount,
    importedPrices: result.prices.length,
    importedPromotions: result.promotions.length,
    rejectedRows: result.rejectedRows,
    errorCount: result.errorCount,
    errors: result.errors,
  };
}

export type RecipeCostResponse =
  | { status: "not_found" }
  | {
      status: "ok";
      servings: number;
      cost: BasketCost;
      unconvertible: string[];
      names: NameMaps;
      storesConfigured: boolean;
      selectedStoreNames: string[];
      allowEstimates: boolean;
      importInfo: { fileName: string } | null;
    };

/** Koszt jednego przygotowania przepisu w wybranych sklepach. Nic nie jest zapisywane. */
export async function recipeCostAction(recipeId: string, drafts: PricingDrafts): Promise<RecipeCostResponse> {
  const recipe = typeof recipeId === "string" ? await catalog.getRecipe(recipeId) : null;
  if (!recipe) return { status: "not_found" };
  const env = await loadPricingEnvironment(sanitizeDrafts(drafts));
  const products = await catalog.getProducts(recipeProductIds([recipe]));
  const { needs, unconvertible } = recipeNeeds(recipe, products);
  return {
    status: "ok",
    servings: recipe.servings,
    cost: costNeeds(needs, env.ctx),
    unconvertible,
    names: namesFor(env),
    storesConfigured: env.stores !== null,
    selectedStoreNames: env.selectedStores.map((s) => s.name),
    allowEstimates: env.ctx.allowEstimates,
    importInfo: env.importInfo ? { fileName: env.importInfo.fileName } : null,
  };
}

export interface PriceTableRow {
  productId: string;
  offers: Offer[];
  expired: Promotion[];
  conditional: Promotion[];
  upcoming: Promotion[];
}

export interface PriceTableResponse {
  rows: PriceTableRow[];
  names: NameMaps;
  selectedStoreIds: string[];
  storesConfigured: boolean;
  importInfo: { fileName: string; prices: number; promotions: number; rejectedRows: number } | null;
}

/** Wszystkie ceny (demo + import z tej karty) ze statusem aktualności liczonym na dziś. */
export async function priceTableAction(drafts: PricingDrafts): Promise<PriceTableResponse> {
  const env = await loadPricingEnvironment(sanitizeDrafts(drafts));
  const rows = env.products.map((product) => {
    const result = productOffers(product, env.ctx.prices, env.ctx.promotions, env.today);
    return {
      productId: product.id,
      offers: [...result.offers].sort((a, b) => a.unitPriceGrosze - b.unitPriceGrosze),
      expired: result.expiredPromotions,
      conditional: result.conditionalPromotions,
      upcoming: result.upcomingPromotions,
    };
  });
  return {
    rows,
    names: namesFor(env),
    selectedStoreIds: [...env.ctx.storeIds],
    storesConfigured: env.stores !== null,
    importInfo: env.importInfo,
  };
}
