"use client";

import { useActionState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { describedBy, Field, Input, Select } from "@/components/ui/form";
import { ACTIVITY_LEVELS, SEXES } from "@/features/nutrition/types";
import { PREP_TIME_OPTIONS } from "@/features/preferences/diet-styles";
import { DEFAULT_DIET_FORM_VALUES } from "@/features/preferences/schema";
import { DEFAULT_PROFILE_FORM_VALUES, profileDraftSchema, type ProfileField, type ProfileFormValues } from "@/features/profile/schema";
import { getMessages } from "@/i18n";
import { DRAFT_KEYS, useSessionDraft } from "@/lib/session-draft";
import { saveWizardProfileAction, type WizardProfileState } from "../actions";
import { dietValuesFromDraft, hasChosenGoal } from "../progress";
import { wizardStepById } from "../steps";

const initial: WizardProfileState = {
  status: "idle",
  values: { ...DEFAULT_PROFILE_FORM_VALUES, goal: "" },
  maxPrepMinutes: DEFAULT_DIET_FORM_VALUES.maxPrepMinutes,
};

export function ProfileStep() {
  const t = getMessages();
  const f = t.profile.fields;
  const w = t.wizard;
  const router = useRouter();
  const profileDraft = useSessionDraft(DRAFT_KEYS.profile);
  const dietDraft = useSessionDraft(DRAFT_KEYS.diet);
  const { save: saveProfile } = profileDraft;
  const { save: saveDiet } = dietDraft;
  const draftValues = useMemo((): ProfileFormValues | null => {
    if (profileDraft.value === "") return null;
    try {
      const parsed = profileDraftSchema.safeParse(JSON.parse(profileDraft.value));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }, [profileDraft.value]);
  const draftPrep = dietValuesFromDraft(dietDraft.value).maxPrepMinutes;
  const [state, formAction, pending] = useActionState(saveWizardProfileAction, initial);
  const values = state.status === "idle" && draftValues ? draftValues : state.values;
  const maxPrepMinutes = state.status === "idle" ? draftPrep : state.maxPrepMinutes;
  const errors: Partial<Record<ProfileField | "maxPrepMinutes", string>> = state.status === "invalid" ? state.fieldErrors : {};

  useEffect(() => {
    if (state.status !== "success") return;
    saveProfile(JSON.stringify(state.values));
    saveDiet(JSON.stringify(state.dietValues));
    router.push(wizardStepById("goal").path);
  }, [state, saveProfile, saveDiet, router]);

  const aria = (id: ProfileField | "maxPrepMinutes", hint?: string) => ({
    id,
    name: id,
    invalid: Boolean(errors[id]),
    "aria-describedby": describedBy(id, { hint, error: errors[id] }),
  });

  return (
    <form key={JSON.stringify({ values, maxPrepMinutes })} action={formAction} noValidate className="max-w-xl space-y-6">
      <p className="text-sm leading-relaxed text-muted">{t.profile.privacyNote}</p>
      {state.status === "invalid" ? (
        <Alert tone="danger" data-testid="form-error">
          {state.message}
        </Alert>
      ) : null}
      <input type="hidden" name="dietDraft" value={dietDraft.value} />
      <input type="hidden" name="goal" value={hasChosenGoal(values.goal) ? values.goal : ""} />
      {values.healthFlags.map((flag) => (
        <input key={flag} type="hidden" name="healthFlags" value={flag} />
      ))}

      <Card className="space-y-5">
        <Field id="birthDate" label={f.birthDate} error={errors.birthDate}>
          <Input type="date" defaultValue={values.birthDate} autoComplete="bday" {...aria("birthDate")} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="heightCm" label={f.heightCm} error={errors.heightCm}>
            <Input inputMode="decimal" defaultValue={values.heightCm} {...aria("heightCm")} />
          </Field>
          <Field id="weightKg" label={f.weightKg} error={errors.weightKg}>
            <Input inputMode="decimal" defaultValue={values.weightKg} {...aria("weightKg")} />
          </Field>
        </div>
        <Field id="targetWeightKg" label={f.targetWeightKg} optionalLabel={t.common.optional} error={errors.targetWeightKg}>
          <Input inputMode="decimal" defaultValue={values.targetWeightKg} {...aria("targetWeightKg")} />
        </Field>
        <Field id="sex" label={f.sex} hint={f.sexHint} error={errors.sex}>
          <Select defaultValue={values.sex} {...aria("sex", f.sexHint)}>
            {SEXES.map((sex) => (
              <option key={sex} value={sex}>
                {t.profile.sex[sex]}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="activityLevel" label={f.activityLevel} error={errors.activityLevel}>
          <Select defaultValue={values.activityLevel} {...aria("activityLevel")}>
            {ACTIVITY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {t.profile.activity[level]}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="mealsPerDay" label={f.mealsPerDay} error={errors.mealsPerDay}>
          <Select defaultValue={values.mealsPerDay} {...aria("mealsPerDay")}>
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={String(n)}>
                {n}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="maxPrepMinutes" label={t.preferences.fields.maxPrepMinutes} error={errors.maxPrepMinutes}>
          <Select defaultValue={maxPrepMinutes} {...aria("maxPrepMinutes")}>
            {PREP_TIME_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "none" ? t.preferences.noLimit : t.preferences.minutes(option)}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      <Button type="submit" size="lg" disabled={pending} data-testid="wizard-next">
        {pending ? w.saving : w.next}
      </Button>
    </form>
  );
}
