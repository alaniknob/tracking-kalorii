import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DEMO_RECIPES } from "@/features/recipes/demo-recipes";
import { DEMO_PRODUCTS } from "./demo-products";
import { buildDemoSeedSql } from "./seed-sql";

const SEED_PATH = fileURLToPath(new URL("../../../supabase/seed.sql", import.meta.url));

describe("supabase/seed.sql", () => {
  it("jest zgodny z danymi demo w kodzie (npm run db:seed:generate)", () => {
    const expected = buildDemoSeedSql(DEMO_PRODUCTS, DEMO_RECIPES);
    if (process.env.UPDATE_SEED === "1") writeFileSync(SEED_PATH, expected);
    expect(readFileSync(SEED_PATH, "utf8")).toBe(expected);
  });

  it("escapuje apostrofy w tekstach", () => {
    const [product] = DEMO_PRODUCTS;
    const sql = buildDemoSeedSql([{ ...product, name: "Chleb 'domowy'" }], []);
    expect(sql).toContain("'Chleb ''domowy'''");
  });
});
