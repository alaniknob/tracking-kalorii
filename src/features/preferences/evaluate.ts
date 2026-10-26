import { getMessages } from "@/i18n";
import { fieldErrorsOf, parseDraft } from "@/lib/draft";
import { resolveFoodRules, type FoodRules } from "./rules";
import {
  dietDraftSchema,
  dietSettingsSchema,
  restrictionsDraftSchema,
  restrictionsSchema,
  type DietField,
  type DietFormValues,
  type DietSettings,
  type RestrictionsField,
  type RestrictionsFormValues,
  type RestrictionsSettings,
} from "./schema";

export type SettingsFormState<Values, Field extends string> =
  | { status: "idle"; values: Values }
  | { status: "invalid"; values: Values; message: string; fieldErrors: Partial<Record<Field, string>> }
  | { status: "conflict" | "success"; values: Values; rules: FoodRules; usedOtherDraft: boolean };

export type DietFormState = SettingsFormState<DietFormValues, DietField>;
export type RestrictionsFormState = SettingsFormState<RestrictionsFormValues, RestrictionsField>;

function toState<Values>(values: Values, rules: FoodRules, usedOtherDraft: boolean) {
  return { status: rules.hasBlockingConflict ? ("conflict" as const) : ("success" as const), values, rules, usedOtherDraft };
}

const toDietRules = (diet: DietSettings) => ({
  dietStyles: diet.dietStyles,
  dislikedProducts: diet.dislikedProducts,
  preferredProducts: diet.preferredProducts,
});

/** Reguły z wersji roboczych obu ekranów (niezaufane dane z przeglądarki, walidowane od nowa). */
export function resolveRulesFromDrafts(dietDraftJson: string, restrictionsDraftJson: string) {
  const diet = parseDraft<DietSettings>(dietDraftJson, dietDraftSchema, dietSettingsSchema);
  const restrictions = parseDraft<RestrictionsSettings>(restrictionsDraftJson, restrictionsDraftSchema, restrictionsSchema);
  return {
    hasSettings: diet !== null || restrictions !== null,
    rules: resolveFoodRules(diet ? toDietRules(diet) : null, restrictions),
  };
}

export function evaluateDietSettings(values: DietFormValues, restrictionsDraftJson = ""): DietFormState {
  const parsed = dietSettingsSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "invalid",
      values,
      message: getMessages().validation.formInvalid,
      fieldErrors: fieldErrorsOf<DietField>(parsed.error),
    };
  }
  const restrictions = parseDraft<RestrictionsSettings>(restrictionsDraftJson, restrictionsDraftSchema, restrictionsSchema);
  return toState(values, resolveFoodRules(toDietRules(parsed.data), restrictions), restrictions !== null);
}

export function evaluateRestrictions(values: RestrictionsFormValues, dietDraftJson = ""): RestrictionsFormState {
  const parsed = restrictionsSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "invalid",
      values,
      message: getMessages().validation.formInvalid,
      fieldErrors: fieldErrorsOf<RestrictionsField>(parsed.error),
    };
  }
  const diet = parseDraft<DietSettings>(dietDraftJson, dietDraftSchema, dietSettingsSchema);
  return toState(values, resolveFoodRules(diet ? toDietRules(diet) : null, parsed.data), diet !== null);
}
