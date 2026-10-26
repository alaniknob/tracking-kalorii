import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { DeleteAccountForm } from "@/features/auth/components/delete-account-form";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { firstIncompleteWizardPath, isWizardComplete } from "@/features/onboarding/progress";
import { loadWizardDrafts, requireSignedIn } from "@/features/onboarding/gate";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { SCREENS } from "@/config/routes";
import { getMessages } from "@/i18n";

const t = getMessages();

export const metadata: Metadata = { title: t.screens.profileSettings.title };

export default async function Page() {
  const auth = await requireSignedIn();
  const drafts = await loadWizardDrafts();
  const complete = isWizardComplete(drafts);
  const resume = firstIncompleteWizardPath(drafts);
  const a = t.auth.account;

  return (
    <Container>
      <PageHeader title={t.screens.profileSettings.title} description={t.screens.profileSettings.description} />
      <div className="space-y-6">
        <Alert tone="success" data-testid="account-email">
          {a.signedIn(auth.email ?? t.auth.nav.account)}
        </Alert>
        {!complete && resume ? (
          <Alert tone="info">
            <p>{t.wizard.resumeNote}</p>
            <ButtonLink href={resume} className="mt-3">
              {t.wizard.next}
            </ButtonLink>
          </Alert>
        ) : null}
        {complete ? (
          <>
            <p className="text-sm text-muted">{a.editProfile}</p>
            <ProfileForm />
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={SCREENS.allergies.path} variant="secondary">
                {t.screens.allergies.title}
              </ButtonLink>
              <ButtonLink href={SCREENS.nutritionSettings.path} variant="secondary">
                {t.screens.nutritionSettings.title}
              </ButtonLink>
              <ButtonLink href={SCREENS.stores.path} variant="secondary">
                {t.screens.stores.title}
              </ButtonLink>
              <ButtonLink href={SCREENS.budget.path} variant="secondary">
                {t.screens.budget.title}
              </ButtonLink>
            </div>
          </>
        ) : null}
        <LogoutButton />
        <DeleteAccountForm />
      </div>
    </Container>
  );
}
