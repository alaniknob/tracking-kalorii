import type { AllergenCode } from "@/features/allergens";
import type { Recipe } from "@/features/recipes/types";
import type { Product } from "./types";

const q = (value: string | null): string => (value === null ? "null" : `'${value.replaceAll("'", "''")}'`);
const n = (value: number | null): string => (value === null ? "null" : String(value));
const arr = (values: readonly string[]): string => `array[${values.map(q).join(", ")}]::text[]`;

/**
 * Generuje `supabase/seed.sql` z danych demo w kodzie — jedno źródło danych przykładowych.
 * Każdy rekord ma `is_demo = true`. Aktualizacja: `npm run db:seed:generate`.
 */
export function buildDemoSeedSql(products: readonly Product[], recipes: readonly Recipe[]): string {
  const lines: string[] = [
    "-- WYGENEROWANE z src/features/{products,recipes}/demo-*.ts — nie edytuj ręcznie.",
    "-- Aktualizacja: npm run db:seed:generate",
    "-- DANE PRZYKŁADOWE (DEMO): przybliżone wartości typowe, nie z etykiet konkretnych produktów.",
    "",
    "begin;",
    "",
  ];

  for (const p of products) {
    lines.push(
      "insert into public.products (slug, name, brand, category, base_unit, package_size, grams_per_piece, density_g_per_ml, " +
        "ingredients_text, ingredients_known, food_groups, source_name, source_url, is_demo, updated_at) values (" +
        [
          q(p.id),
          q(p.name),
          q(p.brand),
          q(p.category),
          q(p.baseUnit),
          n(p.packageSize),
          n(p.gramsPerPiece),
          n(p.densityGPerMl),
          q(p.ingredientsText),
          String(p.allergens.ingredientsKnown),
          arr(p.foodGroups),
          q(p.source.name),
          q(p.source.url),
          String(p.source.isDemo),
          q(p.updatedAt),
        ].join(", ") +
        ");",
    );
    const productId = `(select id from public.products where slug = ${q(p.id)})`;
    if (p.nutrition) {
      const x = p.nutrition;
      lines.push(
        `insert into public.product_nutrition (product_id, kcal, protein_g, fat_g, carbohydrates_g, fiber_g) values (${productId}, ${x.kcal}, ${x.proteinG}, ${x.fatG}, ${x.carbohydratesG}, ${n(x.fiberG)});`,
      );
    }
    for (const [code, declaration] of Object.entries(p.allergens.declared) as [AllergenCode, string][]) {
      lines.push(
        `insert into public.product_allergens (product_id, allergen_code, declaration) values (${productId}, ${q(code)}, ${q(declaration)});`,
      );
    }
  }

  lines.push("");
  for (const r of recipes) {
    lines.push(
      "insert into public.recipes (slug, name, description, meal_types, servings, prep_minutes, difficulty, equipment, " +
        "instructions, cooked_yield_g, reliability, source_name, source_url, is_demo) values (" +
        [
          q(r.id),
          q(r.name),
          q(r.description),
          arr(r.mealTypes),
          n(r.servings),
          n(r.prepMinutes),
          q(r.difficulty),
          arr(r.equipment),
          arr(r.instructions),
          n(r.cookedYieldG),
          q(r.reliability),
          q(r.source.name),
          q(r.source.url),
          String(r.source.isDemo),
        ].join(", ") +
        ");",
    );
    r.ingredients.forEach((i, position) => {
      lines.push(
        "insert into public.recipe_ingredients (recipe_id, product_id, position, amount, unit, note) values (" +
          `(select id from public.recipes where slug = ${q(r.id)}), (select id from public.products where slug = ${q(i.productId)}), ` +
          `${position}, ${i.amount}, ${q(i.unit)}, ${q(i.note)});`,
      );
    });
  }

  lines.push("", "commit;", "");
  return lines.join("\n");
}
