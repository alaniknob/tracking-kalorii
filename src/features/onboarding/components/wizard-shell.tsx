import type { ReactNode } from "react";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { getMessages } from "@/i18n";
import { WIZARD_STEPS, wizardStepIndex, type WizardStepId } from "../steps";

export function WizardShell({ step, children }: { step: WizardStepId; children: ReactNode }) {
  const t = getMessages().wizard;
  const index = wizardStepIndex(step);
  return (
    <Container>
      <p className="pt-8 text-xs font-semibold tracking-wider text-subtle uppercase" data-testid="wizard-progress">
        {t.progress(index + 1, WIZARD_STEPS.length)}
      </p>
      <PageHeader title={t.steps[step].title} description={t.steps[step].description} />
      {children}
    </Container>
  );
}
