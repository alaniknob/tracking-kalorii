import type { Recipe } from "@/features/recipes/types";
import type { Product } from "./types";

/**
 * Źródło danych katalogowych. Obecnie jedyna implementacja to dane demo; w kolejnych etapach
 * dojdzie implementacja Supabase (tabele z `supabase/migrations`) oraz import CSV.
 * Interfejs jest asynchroniczny, aby implementacje bazodanowe nie zmieniały wywołań.
 */
export interface ProductCatalogProvider {
  readonly isDemo: boolean;
  listProducts(): Promise<Product[]>;
  /** Mapa id → produkt dla wskazanych id (brakujące są pomijane). */
  getProducts(ids: readonly string[]): Promise<Map<string, Product>>;
}

export interface RecipeCatalogProvider {
  readonly isDemo: boolean;
  listRecipes(): Promise<Recipe[]>;
  getRecipe(id: string): Promise<Recipe | null>;
}

export function createInMemoryCatalog(
  products: readonly Product[],
  recipes: readonly Recipe[],
  isDemo: boolean,
): ProductCatalogProvider & RecipeCatalogProvider {
  const productIndex = new Map(products.map((p) => [p.id, p]));
  return {
    isDemo,
    async listProducts() {
      return [...products];
    },
    async getProducts(ids) {
      const result = new Map<string, Product>();
      for (const id of ids) {
        const product = productIndex.get(id);
        if (product) result.set(id, product);
      }
      return result;
    },
    async listRecipes() {
      return [...recipes];
    },
    async getRecipe(id) {
      return recipes.find((r) => r.id === id) ?? null;
    },
  };
}
