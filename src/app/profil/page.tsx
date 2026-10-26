import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { ConfigMissing } from "@/features/auth/components/config-missing";
import { DeleteAccountForm } from "@/features/auth/components/delete-account-form";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { getAuthState } from "@/features/auth/session";
import { SCREENS } from "@/config/routes";
import { getMessages } from "@/i18n";

const t = getMessages();

export const metadata: Metadata = { title: t.screens.profileSettings.title };

export default async function Page() {
  const auth = await getAuthState();
  const a = t.auth.account;
  return (
    <Container>
      <PageHeader title={t.screens.profileSettings.title} description={t.screens.profileSettings.description} />
      <div className="max-w-2xl space-y-6">
        {auth.status === "not_configured" ? <ConfigMissing /> : null}
        {auth.status === "anonymous" ? (
          <Alert tone="info" data-testid="account-guest">
            <p>{a.needLogin}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <ButtonLink href={SCREENS.login.path}>{t.auth.nav.login}</ButtonLink>
              <ButtonLink href={SCREENS.register.path} variant="secondary">
                {t.auth.nav.register}
              </ButtonLink>
            </div>
          </Alert>
        ) : null}
        {auth.status === "authenticated" ? (
          <>
            <Alert tone="success" data-testid="account-email">
              {a.signedIn(auth.email ?? t.auth.nav.account)}
            </Alert>
            <p className="text-sm text-muted">{a.editProfile}</p>
            <ButtonLink href={SCREENS.onboarding.path} variant="secondary">
              {t.screens.onboarding.title}
            </ButtonLink>
            <LogoutButton />
            <DeleteAccountForm />
          </>
        ) : null}
      </div>
    </Container>
  );
}
