import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { knownStores, selectedStores, storesSettingsSchema } from "./schema";
import { CHAIN_STORES, customStoreId, findStore, STORE_CHAINS } from "./stores";

describe("sklepy", () => {
  it("identyfikator własnego sklepu jest stabilny i bez polskich znaków", () => {
    expect(customStoreId("Targ na Kleparzu")).toBe("inny-targ-na-kleparzu");
    expect(customStoreId("  Sklep „Żółw” ")).toBe("inny-sklep-zolw");
  });

  it("wyszukuje po id i po nazwie bez względu na wielkość liter", () => {
    expect(findStore(CHAIN_STORES, "LIDL")?.id).toBe("lidl");
    expect(findStore(CHAIN_STORES, "biedronka")?.name).toBe("Biedronka");
    expect(findStore(CHAIN_STORES, "Żabka")).toBeUndefined();
  });

  it("walidacja: co najmniej jeden sklep, znane sieci, bez duplikatów, limity", () => {
    const ok = storesSettingsSchema.parse({ chains: ["lidl", "aldi"], customStores: "Targ, Sklep osiedlowy" });
    expect(selectedStores(ok).map((s) => s.id)).toEqual(["lidl", "aldi", "inny-targ", "inny-sklep-osiedlowy"]);
    expect(knownStores(ok)).toHaveLength(CHAIN_STORES.length + 2);

    expect(storesSettingsSchema.safeParse({ chains: [], customStores: "" }).success).toBe(false);
    expect(storesSettingsSchema.safeParse({ chains: ["zabka"], customStores: "" }).success).toBe(false);
    expect(storesSettingsSchema.safeParse({ chains: ["lidl"], customStores: "Lidl" }).success).toBe(false);
    expect(storesSettingsSchema.safeParse({ chains: [], customStores: "X" }).success).toBe(false);
    expect(
      storesSettingsSchema.safeParse({ chains: [], customStores: Array.from({ length: 11 }, (_, i) => `Sklep ${i}`).join(",") }).success,
    ).toBe(false);
  });

  it("bez ustawień wycena obejmuje wszystkie sieci z listy", () => {
    expect(selectedStores(null)).toEqual(CHAIN_STORES);
  });

  it("migracja SQL zawiera każdą sieć z konfiguracji", () => {
    const sql = readFileSync("supabase/migrations/20261026150000_pricing.sql", "utf8");
    for (const chain of STORE_CHAINS) expect(sql).toContain(`('${chain.id}', '${chain.name}'`);
  });
});
