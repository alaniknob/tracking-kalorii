import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { SCREENS } from "@/config/routes";
import { PriceImport } from "@/features/pricing/components/price-import";
import { PriceTable } from "@/features/pricing/components/price-table";
import { getMessages } from "@/i18n";

const t = getMessages();

export const metadata: Metadata = { title: t.screens.prices.title };

export default function PricesPage() {
  const p = t.pricing;
  return (
    <Container>
      <PageHeader
        title={t.screens.prices.title}
        description={t.screens.prices.description}
        badge={<Badge tone="warning">{p.demoBadge}</Badge>}
      />
      <Alert tone="warning" className="mb-6" data-testid="demo-notice">
        {p.demoNotice}
      </Alert>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="min-w-0 space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">{p.table.title}</h2>
          <p className="text-sm text-muted">
            {p.table.lead}{" "}
            <Link href={SCREENS.stores.path} className="font-medium text-primary hover:underline">
              {t.screens.stores.title}
            </Link>
          </p>
          <PriceTable />
        </section>
        <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <PriceImport />
        </aside>
      </div>
    </Container>
  );
}
