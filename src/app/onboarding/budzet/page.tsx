import type { Metadata } from "next";
import { BudgetForm } from "@/features/budget/components/budget-form";
import { WizardShell } from "@/features/onboarding/components/wizard-shell";
import { enforceWizardStep } from "@/features/onboarding/gate";
import { saveWizardBudgetAction } from "@/features/onboarding/actions";
import { getMessages } from "@/i18n";

const t = getMessages();

export const metadata: Metadata = { title: t.wizard.steps.budget.title };

export default async function BudgetWizardPage() {
  await enforceWizardStep("budget");
  return (
    <WizardShell step="budget">
      <BudgetForm action={saveWizardBudgetAction} continueHref="/" />
    </WizardShell>
  );
}
