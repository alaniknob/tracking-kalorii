import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { WeekView } from "@/features/meal-planning/components/week-view";
import { getMessages } from "@/i18n";

const t = getMessages();

export const metadata: Metadata = { title: t.screens.week.title };

export default function WeekPage() {
  return (
    <Container>
      <PageHeader
        title={t.screens.week.title}
        description={t.screens.week.description}
        badge={<Badge tone="warning">{t.planner.demoBadge}</Badge>}
      />
      <div className="space-y-6">
        <Alert tone="warning" data-testid="demo-notice">
          {t.planner.demoNotice}
        </Alert>
        <WeekView />
      </div>
    </Container>
  );
}
