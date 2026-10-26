import type { Metadata } from "next";
import { ProfileStep } from "@/features/onboarding/components/profile-step";
import { WizardShell } from "@/features/onboarding/components/wizard-shell";
import { enforceWizardStep } from "@/features/onboarding/gate";
import { getMessages } from "@/i18n";

const t = getMessages();

export const metadata: Metadata = { title: t.wizard.steps.profile.title };

export default async function OnboardingPage() {
  await enforceWizardStep("profile");
  return (
    <WizardShell step="profile">
      <ProfileStep />
    </WizardShell>
  );
}
