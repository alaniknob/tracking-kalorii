import type { Metadata } from "next";
import { SCREENS, type ScreenId } from "@/config/routes";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { getMessages } from "@/i18n";
import { Container } from "./container";
import { PageHeader } from "./page-header";

export function unavailableMetadata(id: ScreenId): Metadata {
  return { title: getMessages().screens[id].title };
}

/** Ekran zastępczy dla funkcji z kolejnych etapów — wyraźnie oznaczony, bez atrap. */
export function UnavailableScreen({ id }: { id: ScreenId }) {
  const t = getMessages();
  const screen = SCREENS[id];
  const needsAccounts = screen.stage >= 7 || screen.group === "account";
  return (
    <Container>
      <PageHeader
        title={t.screens[id].title}
        description={t.screens[id].description}
        badge={
          <span className="flex gap-2">
            <Badge tone="warning">{t.unavailable.badge}</Badge>
            <Badge>{t.common.stage(screen.stage)}</Badge>
          </span>
        }
      />
      <div className="max-w-2xl space-y-4">
        <Alert tone="info" data-testid="unavailable-notice">
          {t.unavailable.body(screen.stage)}
        </Alert>
        {needsAccounts ? <Alert tone="warning">{t.unavailable.noAuth}</Alert> : null}
        <ButtonLink href="/" variant="secondary">
          {t.common.backHome}
        </ButtonLink>
      </div>
    </Container>
  );
}
