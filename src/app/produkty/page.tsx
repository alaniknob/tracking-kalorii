import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AllergenList } from "@/features/products/components/allergen-list";
import { dataCompleteness } from "@/features/products/completeness";
import { catalog } from "@/features/recipes/catalog";
import { formatDate, formatGrams, formatKcal, formatNumber, getMessages } from "@/i18n";

const t = getMessages();

export const metadata: Metadata = { title: t.screens.products.title };

const COMPLETENESS_TONE = { complete: "success", partial: "neutral", minimal: "warning" } as const;

export default async function ProductsPage() {
  const products = await catalog.listProducts();
  const c = t.catalog;
  const n = t.nutrition;

  return (
    <Container>
      <PageHeader
        title={t.screens.products.title}
        description={t.screens.products.description}
        badge={catalog.isDemo ? <Badge tone="warning">{c.demoBadge}</Badge> : undefined}
      />
      {catalog.isDemo ? (
        <Alert tone="warning" className="mb-6" data-testid="demo-notice">
          {c.demoNotice}
        </Alert>
      ) : null}
      <ul className="grid gap-4 md:grid-cols-2">
        {products.map((p) => {
          const completeness = dataCompleteness(p);
          return (
            <li key={p.id}>
              <Card className="h-full space-y-3" data-testid={`product-${p.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold tracking-tight">{p.name}</h2>
                    <p className="text-xs text-muted">
                      {c.categories[p.category]} ·{" "}
                      {p.packageSize ? c.package(`${formatNumber(p.packageSize)} ${p.baseUnit}`) : c.byWeight}
                      {p.gramsPerPiece ? ` · ${c.piece(p.gramsPerPiece)}` : ""}
                    </p>
                  </div>
                  <Badge tone={COMPLETENESS_TONE[completeness]}>{c.completeness[completeness]}</Badge>
                </div>
                {p.nutrition ? (
                  <dl className="grid grid-cols-5 gap-2 rounded-lg bg-surface-muted p-3 text-center text-xs">
                    {(
                      [
                        [c.per100(p.baseUnit), formatKcal(p.nutrition.kcal)],
                        [n.protein, formatGrams(p.nutrition.proteinG, undefined, 1)],
                        [n.fat, formatGrams(p.nutrition.fatG, undefined, 1)],
                        [n.carbohydrates, formatGrams(p.nutrition.carbohydratesG, undefined, 1)],
                        [
                          t.recipes.fiber,
                          p.nutrition.fiberG === null ? "—" : `${formatNumber(p.nutrition.fiberG, undefined, 1)} g`,
                        ],
                      ] as const
                    ).map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-muted">{label}</dt>
                        <dd className="mt-0.5 font-semibold text-foreground">{value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="rounded-lg bg-warning-soft p-3 text-xs text-warning">{c.noNutrition}</p>
                )}
                <AllergenList info={p.allergens} />
                <p className="text-xs text-subtle">
                  {c.source}: {p.source.name} · {c.updatedAt}: {formatDate(new Date(`${p.updatedAt}T00:00:00Z`))}
                </p>
              </Card>
            </li>
          );
        })}
      </ul>
    </Container>
  );
}
