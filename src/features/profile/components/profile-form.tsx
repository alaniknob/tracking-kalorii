"use client";

import { useActionState, useMemo } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, describedBy, Field, Input, Select } from "@/components/ui/form";
import { ACTIVITY_LEVELS, GOALS, HEALTH_FLAGS, SEXES } from "@/features/nutrition/types";
import { SCREENS } from "@/config/routes";
import { getMessages } from "@/i18n";
import { DRAFT_KEYS, useSessionDraft } from "@/lib/session-draft";
import { calculateProfileAction } from "../actions";
import type { ProfileFormState } from "../calculate";
import { DEFAULT_PROFILE_FORM_VALUES, profileDraftSchema, type ProfileField, type ProfileFormValues } from "../schema";
import { NutritionSummary } from "./nutrition-summary";

const initialState: ProfileFormState = { status: "idle", values: DEFAULT_PROFILE_FORM_VALUES };

export function ProfileForm() {
  const t = getMessages();
  const f = t.profile.fields;
  const [state, formAction, pending] = useActionState(calculateProfileAction, initialState);
  const draft = useSessionDraft(DRAFT_KEYS.profile);
  const draftValues = useMemo((): ProfileFormValues | null => {
    if (draft.value === "") return null;
    try {
      const parsed = profileDraftSchema.safeParse(JSON.parse(draft.value));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }, [draft.value]);
  const values = state.status === "idle" && draftValues ? draftValues : state.values;
  const savedForPlanner = state.status === "success" && draft.value === JSON.stringify(state.values);
  const errors: Partial<Record<ProfileField, string>> = state.status === "invalid" ? state.fieldErrors : {};

  const aria = (id: ProfileField, hint?: string) => ({
    id,
    name: id,
    invalid: Boolean(errors[id]),
    "aria-describedby": describedBy(id, { hint, error: errors[id] }),
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* React resetuje formularz po akcji; nowy `key` montuje go z przesłanymi wartościami (również dla <select>). */}
      <form
        key={JSON.stringify(values)}
        action={formAction}
        noValidate
        className="space-y-6"
        aria-describedby="profil-prywatnosc"
      >
        <p id="profil-prywatnosc" className="text-sm leading-relaxed text-muted">
          {t.profile.privacyNote}
        </p>
        {state.status === "idle" && draftValues ? (
          <Alert tone="info" data-testid="profile-draft-loaded">
            {t.profile.draft.loaded}{" "}
            <button type="button" onClick={draft.clear} className="font-medium text-primary hover:underline">
              {t.profile.draft.clear}
            </button>
          </Alert>
        ) : null}

        {state.status === "invalid" ? (
          <Alert tone="danger" data-testid="form-error">
            {state.message}
          </Alert>
        ) : null}

        <Card className="space-y-5">
          <h2 className="text-sm font-semibold text-foreground">{t.profile.sections.body}</h2>
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
          <Field id="sex" label={f.sex} hint={f.sexHint} error={errors.sex}>
            <Select defaultValue={values.sex} {...aria("sex", f.sexHint)}>
              {SEXES.map((sex) => (
                <option key={sex} value={sex}>
                  {t.profile.sex[sex]}
                </option>
              ))}
            </Select>
          </Field>
        </Card>

        <Card className="space-y-5">
          <h2 className="text-sm font-semibold text-foreground">{t.profile.sections.goal}</h2>
          <Field id="goal" label={f.goal} error={errors.goal}>
            <Select defaultValue={values.goal} {...aria("goal")}>
              {GOALS.map((goal) => (
                <option key={goal} value={goal}>
                  {t.profile.goal[goal]}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="targetWeightKg" label={f.targetWeightKg} optionalLabel={t.common.optional} error={errors.targetWeightKg}>
            <Input inputMode="decimal" defaultValue={values.targetWeightKg} {...aria("targetWeightKg")} />
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
        </Card>

        <Card>
          <fieldset aria-describedby="healthFlags-hint">
            <legend className="text-sm font-semibold text-foreground">{t.profile.sections.health}</legend>
            <p id="healthFlags-hint" className="mt-1 text-xs leading-relaxed text-muted">
              {f.healthHint}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {HEALTH_FLAGS.map((flag) => (
                <label key={flag} className="flex items-start gap-2.5 text-sm text-foreground">
                  <Checkbox
                    name="healthFlags"
                    value={flag}
                    defaultChecked={values.healthFlags.includes(flag)}
                    className="mt-0.5"
                  />
                  {t.profile.healthFlags[flag]}
                </label>
              ))}
            </div>
            {errors.healthFlags ? <p className="mt-2 text-xs font-medium text-danger">{errors.healthFlags}</p> : null}
          </fieldset>
        </Card>

        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? t.profile.submitting : t.profile.submit}
        </Button>
      </form>

      <div className="lg:sticky lg:top-20 lg:self-start" aria-live="polite">
        {state.status === "success" ? (
          <div className="space-y-4">
            <NutritionSummary result={state.result} mealsPerDay={state.mealsPerDay} />
            <Card className="space-y-3" data-testid="profile-draft">
              <h2 className="text-sm font-semibold">{t.profile.draft.title}</h2>
              <p className="text-xs leading-relaxed text-muted">{t.profile.draft.note}</p>
              {savedForPlanner ? (
                <>
                  <p className="text-sm font-medium text-success" data-testid="profile-draft-saved">
                    {t.profile.draft.saved}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <ButtonLink href={SCREENS.generator.path}>{t.profile.draft.goToGenerator}</ButtonLink>
                    <Button type="button" variant="secondary" onClick={draft.clear}>
                      {t.profile.draft.clear}
                    </Button>
                  </div>
                </>
              ) : (
                <Button type="button" variant="secondary" onClick={() => draft.save(JSON.stringify(state.values))}>
                  {t.profile.draft.save}
                </Button>
              )}
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
