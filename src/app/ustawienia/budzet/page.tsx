import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { BasketCheck } from "@/features/budget/components/basket-check";
import { BudgetForm } from "@/features/budget/components/budget-form";
import { catalog } from "@/features/recipes/catalog";
import { getMessages } from "@/i18n";

const t = getMessages();

export const metadata: Metadata = { title: t.screens.budget.title };

export default async function BudgetPage() {
  const recipes = (await catalog.listRecipes()).map((r) => ({ id: r.id, name: r.name, servings: r.servings }));
  return (
    <Container>
      <PageHeader
        title={t.screens.budget.title}
        description={t.screens.budget.description}
        badge={<Badge tone="warning">{t.pricing.demoBadge}</Badge>}
      />
      <div className="space-y-6">
        <div className="max-w-xl">
          <BudgetForm />
        </div>
        <div className="space-y-4">
          <Alert tone="warning" data-testid="demo-notice">
            {t.pricing.demoNotice}
          </Alert>
          <BasketCheck recipes={recipes} />
        </div>
      </div>
    </Container>
  );
}
