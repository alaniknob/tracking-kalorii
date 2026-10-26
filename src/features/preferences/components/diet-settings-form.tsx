"use client";

import { Card } from "@/components/ui/card";
import { CheckboxLabel, describedBy, Field, Input, Select, Textarea } from "@/components/ui/form";
import { getMessages } from "@/i18n";
import { saveDietSettingsAction } from "../actions";
import { DIET_STYLES, DIFFICULTY_LEVELS, KITCHEN_EQUIPMENT, PREP_TIME_OPTIONS } from "../diet-styles";
import { DEFAULT_DIET_FORM_VALUES, dietDraftSchema, type DietField } from "../schema";
import { SettingsFormShell } from "./settings-form-shell";
import { DRAFT_KEYS } from "@/lib/session-draft";
import { useSettingsForm } from "./use-settings-form";

export function DietSettingsForm() {
  const p = getMessages().preferences;
  const f = p.fields;
  const { state, formAction, pending, values, otherDraft, formKey } = useSettingsForm({
    action: saveDietSettingsAction,
    defaults: DEFAULT_DIET_FORM_VALUES,
    ownDraftKey: DRAFT_KEYS.diet,
    otherDraftKey: DRAFT_KEYS.restrictions,
    draftSchema: dietDraftSchema,
  });
  const errors: Partial<Record<DietField, string>> = state.status === "invalid" ? state.fieldErrors : {};
  const control = (id: DietField, hint?: string) => ({
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
      otherDraftName="restrictionsDraft"
      otherDraftValue={otherDraft}
      otherDraftNote={p.draftIncludedAllergies}
    >
      <Card>
        <fieldset aria-describedby="dietStyles-hint">
          <legend className="text-sm font-semibold">{p.sections.diet}</legend>
          <p id="dietStyles-hint" className="mt-1 text-xs text-muted">
            {p.sections.dietHint}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {DIET_STYLES.map((style) => (
              <CheckboxLabel
                key={style}
                name="dietStyles"
                value={style}
                defaultChecked={values.dietStyles.includes(style)}
              >
                {p.dietStyles[style]}
              </CheckboxLabel>
            ))}
          </div>
          {errors.dietStyles ? <p className="mt-2 text-xs font-medium text-danger">{errors.dietStyles}</p> : null}
        </fieldset>
      </Card>

      <Card className="space-y-5">
        <h2 className="text-sm font-semibold">{p.sections.products}</h2>
        <Field id="dislikedProducts" label={f.dislikedProducts} hint={f.listHint} error={errors.dislikedProducts}>
          <Textarea defaultValue={values.dislikedProducts} {...control("dislikedProducts", f.listHint)} />
        </Field>
        <Field id="preferredProducts" label={f.preferredProducts} hint={f.listHint} error={errors.preferredProducts}>
          <Textarea defaultValue={values.preferredProducts} {...control("preferredProducts", f.listHint)} />
        </Field>
      </Card>

      <Card className="space-y-5">
        <h2 className="text-sm font-semibold">{p.sections.practical}</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="maxPrepMinutes" label={f.maxPrepMinutes} error={errors.maxPrepMinutes}>
            <Select defaultValue={values.maxPrepMinutes} {...control("maxPrepMinutes")}>
              {PREP_TIME_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "none" ? p.noLimit : p.minutes(option)}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="difficulty" label={f.difficulty} error={errors.difficulty}>
            <Select defaultValue={values.difficulty} {...control("difficulty")}>
              {DIFFICULTY_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {p.difficulty[level]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field
          id="maxIngredients"
          label={f.maxIngredients}
          optionalLabel={getMessages().common.optional}
          error={errors.maxIngredients}
        >
          <Input inputMode="numeric" defaultValue={values.maxIngredients} {...control("maxIngredients")} />
        </Field>
        <fieldset>
          <legend className="text-sm font-medium">{f.equipment}</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {KITCHEN_EQUIPMENT.map((item) => (
              <CheckboxLabel key={item} name="equipment" value={item} defaultChecked={values.equipment.includes(item)}>
                {p.equipment[item]}
              </CheckboxLabel>
            ))}
          </div>
          {errors.equipment ? <p className="mt-2 text-xs font-medium text-danger">{errors.equipment}</p> : null}
        </fieldset>
        <CheckboxLabel name="useLeftovers" defaultChecked={values.useLeftovers === "on"}>
          {f.useLeftovers}
        </CheckboxLabel>
      </Card>
    </SettingsFormShell>
  );
}
