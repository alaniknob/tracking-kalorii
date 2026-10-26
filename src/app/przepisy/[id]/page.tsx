import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AllergenList } from "@/features/products/components/allergen-list";
import { toGrams } from "@/features/products/quantity";
import { catalog, recipeProductIds } from "@/features/recipes/catalog";
import { RecipeCost } from "@/features/pricing/components/recipe-cost";
import { NutritionTable } from "@/features/recipes/components/nutrition-table";
import { RecipeFitDetails, RecipeFitProvider } from "@/features/recipes/components/recipe-fit";
import { aggregateRecipeAllergens, recipeFoodGroups } from "@/features/recipes/fit";
import { calculateRecipeNutrition, type RecipeDataIssue } from "@/features/recipes/nutrition";
import { formatNumber, getMessages } from "@/i18n";

const t = getMessages();

type Params = Promise<{ id: string }>;

export async function generateStaticParams() {
  return (await catalog.listRecipes()).map((recipe) => ({ id: recipe.id }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const recipe = await catalog.getRecipe((await params).id);
  return { title: recipe?.name ?? t.screens.recipes.title };
}

export default async function RecipePage({ params }: { params: Params }) {
  const recipe = await catalog.getRecipe((await params).id);
  if (!recipe) notFound();

  const products = await catalog.getProducts(recipeProductIds([recipe]));
  const nutrition = calculateRecipeNutrition(recipe, products);
  const allergens = aggregateRecipeAllergens(recipe, products);
  const groups = recipeFoodGroups(recipe, products);
  const r = t.recipes;
  const p = t.preferences;
  const productName = (id: string) => products.get(id)?.name ?? id;

  const issueText = (issue: Exclude<RecipeDataIssue, { code: "missing_fiber" }>) => {
    switch (issue.code) {
      case "unknown_product":
        return r.issue.unknown_product(issue.productId);
      case "conversion_failed":
        return r.issue.conversion_failed(productName(issue.productId));
      case "missing_nutrition":
        return r.issue.missing_nutrition(productName(issue.productId));
    }
  };
  const blockingIssues = nutrition.issues.filter(
    (i): i is Exclude<RecipeDataIssue, { code: "missing_fiber" }> => i.code !== "missing_fiber",
  );

  return (
    <Container>
      <PageHeader
        title={recipe.name}
        description={recipe.description}
        badge={
          <span className="flex flex-wrap gap-2">
            {recipe.source.isDemo ? <Badge tone="warning">{t.catalog.demoBadge}</Badge> : null}
            <Badge>{r.reliability[recipe.reliability]}</Badge>
          </span>
        }
      />
      <RecipeFitProvider recipeIds={[recipe.id]}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="min-w-0 space-y-6">
            <RecipeFitDetails recipeId={recipe.id} />

            <Card className="space-y-4">
              <p className="text-sm text-muted">
                {r.minutes(recipe.prepMinutes)} · {r.servings(recipe.servings)} · {r.difficulty[recipe.difficulty]} ·{" "}
                {r.equipment}: {recipe.equipment.map((e) => p.equipment[e]).join(", ")}
              </p>
              <NutritionTable
                columns={[
                  { label: r.perServing, values: nutrition.perServing },
                  ...(nutrition.per100gCooked ? [{ label: r.per100Cooked, values: nutrition.per100gCooked }] : []),
                  { label: r.total, values: nutrition.total },
                ]}
              />
              <ul className="space-y-0.5 text-xs text-muted">
                {nutrition.servingMassG !== null ? <li>{r.servingMass(nutrition.servingMassG)}</li> : null}
                {nutrition.rawMassG !== null ? <li>{r.rawMass(nutrition.rawMassG)}</li> : null}
                {nutrition.cookedYieldG !== null ? <li>{r.cookedMass(nutrition.cookedYieldG)}</li> : null}
                <li>{r.calculatedNote}</li>
                {!nutrition.fiberComplete ? <li>{r.fiberIncomplete}</li> : null}
              </ul>
              {!nutrition.complete ? (
                <Alert tone="warning" title={r.incompleteData} data-testid="incomplete-data">
                  <ul className="list-disc pl-4">
                    {blockingIssues.map((issue, i) => (
                      <li key={i}>{issueText(issue)}</li>
                    ))}
                  </ul>
                </Alert>
              ) : null}
            </Card>

            <RecipeCost recipeId={recipe.id} />

            <Card>
              <h2 className="mb-3 text-sm font-semibold">{r.instructions}</h2>
              <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
                {recipe.instructions.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </Card>
          </div>

          <div className="min-w-0 space-y-6">
            <Card>
              <h2 className="mb-3 text-sm font-semibold">{r.ingredients}</h2>
              <ul className="divide-y divide-border text-sm">
                {recipe.ingredients.map((ingredient, index) => {
                  const product = products.get(ingredient.productId);
                  const grams = product ? toGrams(ingredient.amount, ingredient.unit, product) : null;
                  const showGrams = grams?.ok && ingredient.unit !== "g";
                  return (
                    <li key={index} className="flex justify-between gap-3 py-2">
                      <span>
                        {productName(ingredient.productId)}
                        {ingredient.note ? <span className="text-muted">, {ingredient.note}</span> : null}
                      </span>
                      <span className="shrink-0 text-right tabular-nums">
                        {formatNumber(ingredient.amount, undefined, 2)} {ingredient.unit}
                        {showGrams && grams.ok ? (
                          <span className="block text-xs text-muted">≈ {formatNumber(grams.value)} g</span>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
            <Card className="space-y-3">
              <h2 className="text-sm font-semibold">{r.allergens}</h2>
              <AllergenList info={allergens} />
              <h2 className="pt-2 text-sm font-semibold">{r.foodGroups}</h2>
              <p className="text-sm text-muted">
                {groups.length ? groups.map((g) => p.foodGroups[g]).join(", ") : r.noFoodGroups}
              </p>
              <p className="text-xs text-subtle">{p.summary.verificationNote}</p>
            </Card>
            <p className="text-xs text-subtle">
              {t.catalog.source}: {recipe.source.name}
            </p>
            <Link href="/przepisy" className="text-sm font-medium text-primary hover:underline">
              ← {r.backToList}
            </Link>
          </div>
        </div>
      </RecipeFitProvider>
    </Container>
  );
}
