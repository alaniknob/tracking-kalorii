import type { Metadata } from "next";
import { StoresForm } from "@/features/stores/components/stores-form";
import { WizardShell } from "@/features/onboarding/components/wizard-shell";
import { enforceWizardStep } from "@/features/onboarding/gate";
import { saveWizardStoresAction } from "@/features/onboarding/actions";
import { wizardStepById } from "@/features/onboarding/steps";
import { getMessages } from "@/i18n";

const t = getMessages();

export const metadata: Metadata = { title: t.wizard.steps.stores.title };

export default async function StoresWizardPage() {
  await enforceWizardStep("stores");
  return (
    <WizardShell step="stores">
      <StoresForm action={saveWizardStoresAction} continueHref={wizardStepById("budget").path} />
    </WizardShell>
  );
}
