"use client";

import { useActionState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, CheckboxLabel } from "@/components/ui/form";
import { ALLERGEN_REACTIONS, EU_ALLERGENS } from "@/features/allergens";
import { HEALTH_FLAGS } from "@/features/nutrition/types";
import { allergenFieldName, DEFAULT_RESTRICTIONS_FORM_VALUES, restrictionsDraftSchema } from "@/features/preferences/schema";
import { DEFAULT_PROFILE_FORM_VALUES, profileDraftSchema, type ProfileFormValues } from "@/features/profile/schema";
import { getMessages } from "@/i18n";
import { cn } from "@/lib/cn";
import { DRAFT_KEYS, useSessionDraft } from "@/lib/session-draft";
import { saveWizardAllergiesAction, type WizardAllergiesState } from "../actions";
import { wizardStepById } from "../steps";

const reactionStyles = {
  none: "peer-checked:bg-surface peer-checked:text-foreground peer-checked:shadow-card",
  allergy: "peer-checked:bg-danger peer-checked:text-primary-foreground",
  intolerance: "peer-checked:bg-warning peer-checked:text-primary-foreground",
} as const;

const idle: WizardAllergiesState = { status: "idle" };

export function AllergiesStep() {
  const t = getMessages();
  const p = t.preferences;
  const w = t.wizard;
  const router = useRouter();
  const profileDraft = useSessionDraft(DRAFT_KEYS.profile);
  const restrictionsDraft = useSessionDraft(DRAFT_KEYS.restrictions);
  const dietDraft = useSessionDraft(DRAFT_KEYS.diet);
  const { save: saveProfile } = profileDraft;
  const { save: saveRestrictions } = restrictionsDraft;
  const [state, formAction, pending] = useActionState(saveWizardAllergiesAction, idle);

  const profileValues = useMemo((): ProfileFormValues => {
    if (state.status !== "idle") return state.profileValues;
    if (profileDraft.value === "") return DEFAULT_PROFILE_FORM_VALUES;
    try {
      const parsed = profileDraftSchema.safeParse(JSON.parse(profileDraft.value));
      return parsed.success ? parsed.data : DEFAULT_PROFILE_FORM_VALUES;
    } catch {
      return DEFAULT_PROFILE_FORM_VALUES;
    }
  }, [state, profileDraft.value]);

  const restrictionValues = useMemo(() => {
    if (restrictionsDraft.value === "") return DEFAULT_RESTRICTIONS_FORM_VALUES;
    try {
      const parsed = restrictionsDraftSchema.safeParse(JSON.parse(restrictionsDraft.value));
      return parsed.success ? parsed.data : DEFAULT_RESTRICTIONS_FORM_VALUES;
    } catch {
      return DEFAULT_RESTRICTIONS_FORM_VALUES;
    }
  }, [restrictionsDraft.value]);

  useEffect(() => {
    if (state.status !== "success") return;
    saveProfile(JSON.stringify(state.profileValues));
    saveRestrictions(JSON.stringify(state.restrictionValues));
    router.push(wizardStepById("stores").path);
  }, [state, saveProfile, saveRestrictions, router]);

  const errors = state.status === "invalid" ? state.fieldErrors : {};

  return (
    <form action={formAction} noValidate className="max-w-2xl space-y-6">
      {state.status === "invalid" ? (
        <Alert tone="danger" data-testid="form-error">
          {state.message}
        </Alert>
      ) : null}
      <input type="hidden" name="profileDraft" value={profileDraft.value} />
      <input type="hidden" name="dietDraft" value={dietDraft.value} />

      <Card>
        <h2 className="text-sm font-semibold">{p.sections.eu}</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">{p.sections.euHint}</p>
        <ul className="mt-4 divide-y divide-border">
          {EU_ALLERGENS.map((code) => (
            <li key={code}>
              <div
                role="radiogroup"
                aria-labelledby={`${code}-label`}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span id={`${code}-label`} className="text-sm font-medium">
                  {p.allergens[code]}
                </span>
                <div className="flex shrink-0 self-start rounded-full bg-background p-1 text-xs sm:self-auto">
                  {ALLERGEN_REACTIONS.map((reaction) => (
                    <label key={reaction} className="relative">
                      <input
                        type="radio"
                        name={allergenFieldName(code)}
                        value={reaction}
                        defaultChecked={restrictionValues.allergens[code] === reaction}
                        className="peer sr-only"
                        aria-label={`${p.allergens[code]}: ${p.reactions[reaction]}`}
                      />
                      <span
                        className={cn(
                          "block cursor-pointer rounded-full px-3 py-1.5 font-medium text-muted transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
                          reactionStyles[reaction],
                        )}
                      >
                        {p.reactions[reaction]}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
        {errors.allergens ? <p className="mt-2 text-xs font-medium text-danger">{errors.allergens}</p> : null}
        <div className="mt-4 border-t border-border pt-4">
          <CheckboxLabel name="avoidTraces" defaultChecked={restrictionValues.avoidTraces === "on"}>
            {p.fields.avoidTraces}
          </CheckboxLabel>
        </div>
      </Card>

      <Card>
        <fieldset aria-describedby="healthFlags-hint">
          <legend className="text-sm font-semibold text-foreground">{t.profile.sections.health}</legend>
          <p id="healthFlags-hint" className="mt-1 text-xs leading-relaxed text-muted">
            {t.profile.fields.healthHint}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {HEALTH_FLAGS.map((flag) => (
              <label key={flag} className="flex items-start gap-2.5 text-sm text-foreground">
                <Checkbox
                  name="healthFlags"
                  value={flag}
                  defaultChecked={profileValues.healthFlags.includes(flag)}
                  className="mt-0.5"
                />
                {t.profile.healthFlags[flag]}
              </label>
            ))}
          </div>
          {errors.healthFlags ? <p className="mt-2 text-xs font-medium text-danger">{errors.healthFlags}</p> : null}
        </fieldset>
      </Card>

      <Button type="submit" size="lg" disabled={pending} data-testid="wizard-next">
        {pending ? w.saving : w.next}
      </Button>
    </form>
  );
}
