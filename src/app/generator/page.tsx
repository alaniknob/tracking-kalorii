import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { GeneratorPanel, type PantryProductOption } from "@/features/meal-planning/components/generator-panel";
import { pantryUnitsFor } from "@/features/meal-planning/pantry";
import { catalog } from "@/features/recipes/catalog";
import { getMessages } from "@/i18n";

const t = getMessages();

export const metadata: Metadata = { title: t.screens.generator.title };

export default async function GeneratorPage() {
  const products: PantryProductOption[] = (await catalog.listProducts())
    .map((p) => ({ id: p.id, name: p.name, units: pantryUnitsFor(p) }))
    .sort((a, b) => a.name.localeCompare(b.name, "pl"));
  return (
    <Container>
      <PageHeader
        title={t.screens.generator.title}
        description={t.screens.generator.description}
        badge={<Badge tone="warning">{t.planner.demoBadge}</Badge>}
      />
      <div className="space-y-6">
        <Alert tone="warning" data-testid="demo-notice">
          {t.planner.demoNotice}
        </Alert>
        <GeneratorPanel products={products} />
      </div>
    </Container>
  );
}
