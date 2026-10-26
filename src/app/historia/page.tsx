import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { PlanHistory } from "@/features/meal-planning/components/plan-history";
import { getMessages } from "@/i18n";

const t = getMessages();

export const metadata: Metadata = { title: t.screens.history.title };

export default function Page() {
  return (
    <Container>
      <PageHeader title={t.screens.history.title} description={t.screens.history.description} />
      <PlanHistory />
    </Container>
  );
}
