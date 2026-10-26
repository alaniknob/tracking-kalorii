import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { catalog, recipeProductIds } from "@/features/recipes/catalog";
import { RecipeFitBadge, RecipeFitProvider } from "@/features/recipes/components/recipe-fit";
import { calculateRecipeNutrition } from "@/features/recipes/nutrition";
import { formatGrams, formatKcal, getMessages } from "@/i18n";

const t = getMessages();

export const metadata: Metadata = { title: t.screens.recipes.title };

export default async function RecipesPage() {
  const recipes = await catalog.listRecipes();
  const products = await catalog.getProducts(recipeProductIds(recipes));
  const r = t.recipes;
  const n = t.nutrition;

  return (
    <Container>
      <PageHeader
        title={t.screens.recipes.title}
        description={t.screens.recipes.description}
        badge={catalog.isDemo ? <Badge tone="warning">{t.catalog.demoBadge}</Badge> : undefined}
      />
      {catalog.isDemo ? (
        <Alert tone="warning" className="mb-6" data-testid="demo-notice">
          {t.catalog.demoNotice}
        </Alert>
      ) : null}
      <RecipeFitProvider recipeIds={recipes.map((recipe) => recipe.id)}>
        <ul className="grid gap-4 md:grid-cols-2">
          {recipes.map((recipe) => {
            const nutrition = calculateRecipeNutrition(recipe, products);
            return (
              <li key={recipe.id}>
                <Link href={`/przepisy/${recipe.id}`} className="block h-full rounded-xl focus-visible:outline-offset-4">
                  <Card className="h-full space-y-3 transition-shadow hover:shadow-raised">
                    <div className="flex flex-wrap gap-1.5">
                      {recipe.mealTypes.map((m) => (
                        <Badge key={m}>{r.mealTypes[m]}</Badge>
                      ))}
                      <RecipeFitBadge recipeId={recipe.id} />
                    </div>
                    <h2 className="font-semibold tracking-tight">{recipe.name}</h2>
                    <p className="text-sm text-muted">
                      {r.minutes(recipe.prepMinutes)} · {r.servings(recipe.servings)} · {r.difficulty[recipe.difficulty]}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">
                        {nutrition.complete ? "" : "≥ "}
                        {formatKcal(nutrition.perServing.kcal)}
                      </span>{" "}
                      <span className="text-muted">
                        / {r.perServing.toLowerCase()} · {n.protein} {formatGrams(nutrition.perServing.proteinG)}
                      </span>
                    </p>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      </RecipeFitProvider>
    </Container>
  );
}
