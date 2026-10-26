import type { Metadata } from "next";
import { AllergiesStep } from "@/features/onboarding/components/allergies-step";
import { WizardShell } from "@/features/onboarding/components/wizard-shell";
import { enforceWizardStep } from "@/features/onboarding/gate";
import { getMessages } from "@/i18n";

const t = getMessages();

export const metadata: Metadata = { title: t.wizard.steps.allergies.title };

export default async function AllergiesWizardPage() {
  await enforceWizardStep("allergies");
  return (
    <WizardShell step="allergies">
      <AllergiesStep />
    </WizardShell>
  );
}
