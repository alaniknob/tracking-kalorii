import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ShoppingListScreen } from "@/features/shopping/components/shopping-list";
import { getMessages } from "@/i18n";

const t = getMessages();

export const metadata: Metadata = { title: t.screens.shopping.title };

export default function ShoppingPage() {
  return (
    <Container>
      <PageHeader
        title={t.screens.shopping.title}
        description={t.screens.shopping.description}
        badge={<Badge tone="warning">{t.planner.demoBadge}</Badge>}
      />
      <div className="mx-auto max-w-3xl space-y-5">
        <Alert tone="warning" data-testid="demo-notice">
          {t.shopping.demoNotice}
        </Alert>
        <ShoppingListScreen />
      </div>
    </Container>
  );
}
