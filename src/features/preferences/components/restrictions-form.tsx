"use client";

import { Card } from "@/components/ui/card";
import { CheckboxLabel, describedBy, Field, Textarea } from "@/components/ui/form";
import { ALLERGEN_REACTIONS, EU_ALLERGENS } from "@/features/allergens";
import { getMessages } from "@/i18n";
import { cn } from "@/lib/cn";
import { saveRestrictionsAction } from "../actions";
import {
  allergenFieldName,
  DEFAULT_RESTRICTIONS_FORM_VALUES,
  restrictionsDraftSchema,
  type RestrictionsField,
} from "../schema";
import { SettingsFormShell } from "./settings-form-shell";
import { DRAFT_KEYS } from "@/lib/session-draft";
import { useSettingsForm } from "./use-settings-form";

const reactionStyles = {
  none: "peer-checked:bg-surface peer-checked:text-foreground peer-checked:shadow-card",
  allergy: "peer-checked:bg-danger peer-checked:text-primary-foreground",
  intolerance: "peer-checked:bg-warning peer-checked:text-primary-foreground",
} as const;

export function RestrictionsForm() {
  const p = getMessages().preferences;
  const f = p.fields;
  const { state, formAction, pending, values, otherDraft, formKey } = useSettingsForm({
    action: saveRestrictionsAction,
    defaults: DEFAULT_RESTRICTIONS_FORM_VALUES,
    ownDraftKey: DRAFT_KEYS.restrictions,
    otherDraftKey: DRAFT_KEYS.diet,
    draftSchema: restrictionsDraftSchema,
  });
  const errors: Partial<Record<RestrictionsField, string>> = state.status === "invalid" ? state.fieldErrors : {};
  const control = (id: RestrictionsField, hint?: string) => ({
    id,
    name: id,
    invalid: Boolean(errors[id]),
    "aria-describedby": describedBy(id, { hint, error: errors[id] }),
  });

  return (
    <SettingsFormShell
      state={state}
      pending={pending}
      formKey={formKey}
      action={formAction}
      otherDraftName="dietDraft"
      otherDraftValue={otherDraft}
      otherDraftNote={p.draftIncludedDiet}
    >
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
                        defaultChecked={values.allergens[code] === reaction}
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
          <CheckboxLabel name="avoidTraces" defaultChecked={values.avoidTraces === "on"}>
            {f.avoidTraces}
          </CheckboxLabel>
        </div>
      </Card>

      <Card className="space-y-5">
        <h2 className="text-sm font-semibold">{p.sections.custom}</h2>
        <Field id="otherAllergies" label={f.otherAllergies} hint={f.listHint} error={errors.otherAllergies}>
          <Textarea defaultValue={values.otherAllergies} {...control("otherAllergies", f.listHint)} />
        </Field>
        <Field id="otherIntolerances" label={f.otherIntolerances} hint={f.listHint} error={errors.otherIntolerances}>
          <Textarea defaultValue={values.otherIntolerances} {...control("otherIntolerances", f.listHint)} />
        </Field>
        <Field
          id="voluntaryExclusions"
          label={f.voluntaryExclusions}
          hint={f.voluntaryHint}
          error={errors.voluntaryExclusions}
        >
          <Textarea defaultValue={values.voluntaryExclusions} {...control("voluntaryExclusions", f.voluntaryHint)} />
        </Field>
      </Card>
    </SettingsFormShell>
  );
}
