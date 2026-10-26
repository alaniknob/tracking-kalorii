export const WIZARD_STEP_IDS = ["profile", "goal", "allergies", "stores", "budget"] as const;
export type WizardStepId = (typeof WIZARD_STEP_IDS)[number];

export const WIZARD_STEPS = [
  { id: "profile", path: "/onboarding" },
  { id: "goal", path: "/onboarding/cel" },
  { id: "allergies", path: "/onboarding/alergie" },
  { id: "stores", path: "/onboarding/sklepy" },
  { id: "budget", path: "/onboarding/budzet" },
] as const satisfies readonly { id: WizardStepId; path: string }[];

export function wizardStepById(id: WizardStepId) {
  return WIZARD_STEPS.find((step) => step.id === id)!;
}

export function wizardStepIndex(id: WizardStepId): number {
  return WIZARD_STEPS.findIndex((step) => step.id === id);
}
