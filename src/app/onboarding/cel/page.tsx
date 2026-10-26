import type { Metadata } from "next";
import { GoalStep } from "@/features/onboarding/components/goal-step";
import { WizardShell } from "@/features/onboarding/components/wizard-shell";
import { enforceWizardStep } from "@/features/onboarding/gate";
import { getMessages } from "@/i18n";

const t = getMessages();

export const metadata: Metadata = { title: t.wizard.steps.goal.title };

export default async function GoalPage() {
  await enforceWizardStep("goal");
  return (
    <WizardShell step="goal">
      <GoalStep />
    </WizardShell>
  );
}
