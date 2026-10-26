import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ConfigMissing } from "@/features/auth/components/config-missing";
import { getAuthState } from "@/features/auth/session";
import { SCREENS } from "@/config/routes";
import { getMessages } from "@/i18n";

const t = getMessages();

export const metadata: Metadata = { title: t.screens.dashboard.title };

export default async function Page() {
  const auth = await getAuthState();
  const d = t.auth.dashboard;
  return (
    <Container>
      <PageHeader title={t.screens.dashboard.title} description={t.screens.dashboard.description} />
      <div className="max-w-2xl space-y-4">
        {auth.status === "not_configured" ? <ConfigMissing /> : null}
        {auth.status === "anonymous" ? (
          <Alert tone="info" data-testid="dashboard-guest">
            {d.guest}
          </Alert>
        ) : null}
        {auth.status === "authenticated" ? (
          <Alert tone="success" data-testid="dashboard-user">
            {d.signedIn(auth.email ?? t.auth.nav.account)}
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardTitle>{t.screens.generator.title}</CardTitle>
            <CardDescription>{d.planHint}</CardDescription>
            <ButtonLink href={SCREENS.generator.path} className="mt-3">
              {t.screens.generator.title}
            </ButtonLink>
          </Card>
          <Card>
            <CardTitle>{t.screens.shopping.title}</CardTitle>
            <CardDescription>{d.shoppingHint}</CardDescription>
            <ButtonLink href={SCREENS.shopping.path} className="mt-3" variant="secondary">
              {t.screens.shopping.title}
            </ButtonLink>
          </Card>
          <Card>
            <CardTitle>{t.screens.history.title}</CardTitle>
            <CardDescription>{d.historyHint}</CardDescription>
            <ButtonLink href={SCREENS.history.path} className="mt-3" variant="secondary">
              {t.screens.history.title}
            </ButtonLink>
          </Card>
          <Card>
            <CardTitle>{t.screens.profileSettings.title}</CardTitle>
            <CardDescription>{d.accountHint}</CardDescription>
            <ButtonLink href={SCREENS.profileSettings.path} className="mt-3" variant="secondary">
              {t.screens.profileSettings.title}
            </ButtonLink>
          </Card>
        </div>
      </div>
    </Container>
  );
}
