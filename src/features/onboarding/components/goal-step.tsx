"use client";

import { useActionState, useEffect, useMemo } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { describedBy, Field, Select } from "@/components/ui/form";
import { NutritionSummary } from "@/features/profile/components/nutrition-summary";
import { GOALS } from "@/features/nutrition/types";
import { DEFAULT_PROFILE_FORM_VALUES, profileDraftSchema, type ProfileField, type ProfileFormValues } from "@/features/profile/schema";
import { getMessages } from "@/i18n";
import { DRAFT_KEYS, useSessionDraft } from "@/lib/session-draft";
import { saveWizardGoalAction, type WizardGoalState } from "../actions";
import { wizardStepById } from "../steps";

const idle: WizardGoalState = { status: "idle", values: DEFAULT_PROFILE_FORM_VALUES };

export function GoalStep() {
  const t = getMessages();
  const f = t.profile.fields;
  const w = t.wizard;
  const profileDraft = useSessionDraft(DRAFT_KEYS.profile);
  const { save: saveProfile } = profileDraft;
  const draftValues = useMemo((): ProfileFormValues | null => {
    if (profileDraft.value === "") return null;
    try {
      const parsed = profileDraftSchema.safeParse(JSON.parse(profileDraft.value));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }, [profileDraft.value]);
  const [state, formAction, pending] = useActionState(saveWizardGoalAction, idle);
  const values = state.status === "idle" && draftValues ? draftValues : state.values;
  const errors: Partial<Record<ProfileField, string>> = state.status === "invalid" ? state.fieldErrors : {};

  useEffect(() => {
    if (state.status === "success") saveProfile(JSON.stringify(state.values));
  }, [state, saveProfile]);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form key={JSON.stringify(values)} action={formAction} noValidate className="space-y-6">
        {state.status === "invalid" ? (
          <Alert tone="danger" data-testid="form-error">
            {state.message}
            {errors.targetWeightKg ? (
              <p className="mt-2">
                <ButtonLink href={wizardStepById("profile").path} variant="ghost" className="h-auto px-0">
                  {w.backToProfile}
                </ButtonLink>
              </p>
            ) : null}
          </Alert>
        ) : null}
        <input type="hidden" name="profileDraft" value={profileDraft.value} />
        <Card className="space-y-5">
          <Field id="goal" label={f.goal} error={errors.goal}>
            <Select
              id="goal"
              name="goal"
              defaultValue={values.goal || "maintain"}
              invalid={Boolean(errors.goal)}
              aria-describedby={describedBy("goal", { error: errors.goal })}
            >
              {GOALS.map((goal) => (
                <option key={goal} value={goal}>
                  {t.profile.goal[goal]}
                </option>
              ))}
            </Select>
          </Field>
        </Card>
        <Button type="submit" size="lg" disabled={pending} data-testid="wizard-calculate">
          {pending ? t.profile.submitting : t.profile.submit}
        </Button>
      </form>

      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start" aria-live="polite">
        {state.status === "success" ? (
          <>
            <NutritionSummary result={state.result} mealsPerDay={state.mealsPerDay} />
            <ButtonLink href={wizardStepById("allergies").path} size="lg" data-testid="wizard-next">
              {w.next}
            </ButtonLink>
          </>
        ) : null}
      </div>
    </div>
  );
}
