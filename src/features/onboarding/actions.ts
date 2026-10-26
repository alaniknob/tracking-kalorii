"use server";

import { persistDraftAction } from "@/features/auth/persist";
import { saveBudgetAction, type BudgetFormState } from "@/features/budget/actions";
import { DRAFT_KEYS } from "@/lib/draft-keys";
import { getMessages } from "@/i18n";
import { HEALTH_FLAGS } from "@/features/nutrition/types";
import { evaluateDietSettings, evaluateRestrictions } from "@/features/preferences/evaluate";
import {
  DEFAULT_DIET_FORM_VALUES,
  type DietFormValues,
  readRestrictionsFormData,
  type RestrictionsField,
  type RestrictionsFormValues,
} from "@/features/preferences/schema";
import { evaluateProfile, type ProfileFormState } from "@/features/profile/calculate";
import { readProfileFormData, type ProfileField, type ProfileFormValues } from "@/features/profile/schema";
import { saveStoresAction, type StoresFormState } from "@/features/stores/actions";
import { dietValuesFromDraft, evaluateProfileBody, hasChosenGoal, parseProfileDraft } from "./progress";

export type WizardProfileState =
  | { status: "idle"; values: ProfileFormValues; maxPrepMinutes: string }
  | {
      status: "invalid";
      values: ProfileFormValues;
      maxPrepMinutes: string;
      message: string;
      fieldErrors: Partial<Record<ProfileField | "maxPrepMinutes", string>>;
    }
  | { status: "success"; values: ProfileFormValues; maxPrepMinutes: string; dietValues: DietFormValues };

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function saveWizardProfileAction(
  _prev: WizardProfileState,
  formData: FormData,
): Promise<WizardProfileState> {
  const values = readProfileFormData(formData);
  const maxPrepMinutes = text(formData, "maxPrepMinutes");
  const body = evaluateProfileBody({ ...values, goal: hasChosenGoal(values.goal) ? values.goal : "maintain" });
  if (body.status === "invalid") {
    return { status: "invalid", values, maxPrepMinutes, message: body.message, fieldErrors: body.fieldErrors };
  }
  const dietValues: DietFormValues = {
    ...dietValuesFromDraft(text(formData, "dietDraft")),
    maxPrepMinutes: maxPrepMinutes || DEFAULT_DIET_FORM_VALUES.maxPrepMinutes,
  };
  const diet = evaluateDietSettings(dietValues);
  if (diet.status === "invalid") {
    return {
      status: "invalid",
      values,
      maxPrepMinutes,
      message: diet.message,
      fieldErrors: { maxPrepMinutes: diet.fieldErrors.maxPrepMinutes },
    };
  }
  const saved: ProfileFormValues = { ...values, goal: hasChosenGoal(values.goal) ? values.goal : "" };
  await persistDraftAction(DRAFT_KEYS.profile, JSON.stringify(saved));
  await persistDraftAction(DRAFT_KEYS.diet, JSON.stringify(dietValues));
  return { status: "success", values: saved, maxPrepMinutes, dietValues };
}

export type WizardGoalState = ProfileFormState;

export async function saveWizardGoalAction(_prev: WizardGoalState, formData: FormData): Promise<WizardGoalState> {
  const parsed = parseProfileDraft(text(formData, "profileDraft")) ?? readProfileFormData(formData);
  const values: ProfileFormValues = { ...parsed, goal: text(formData, "goal") };
  const state = evaluateProfile(values);
  if (state.status === "invalid") return state;
  await persistDraftAction(DRAFT_KEYS.profile, JSON.stringify(state.values));
  return state;
}

export type WizardAllergiesState =
  | { status: "idle" }
  | {
      status: "invalid";
      message: string;
      fieldErrors: Partial<Record<RestrictionsField | "healthFlags", string>>;
      profileValues: ProfileFormValues;
    }
  | { status: "success"; profileValues: ProfileFormValues; restrictionValues: RestrictionsFormValues };

export async function saveWizardAllergiesAction(
  _prev: WizardAllergiesState,
  formData: FormData,
): Promise<WizardAllergiesState> {
  const profileValues = parseProfileDraft(text(formData, "profileDraft")) ?? readProfileFormData(formData);
  const healthFlags = formData.getAll("healthFlags").filter((value): value is string => typeof value === "string");
  const unknownHealth = healthFlags.filter((flag) => !(HEALTH_FLAGS as readonly string[]).includes(flag));
  if (unknownHealth.length > 0) {
    return {
      status: "invalid",
      message: getMessages().validation.formInvalid,
      fieldErrors: { healthFlags: getMessages().validation.option },
      profileValues,
    };
  }
  const flags = healthFlags.filter((flag): flag is (typeof HEALTH_FLAGS)[number] =>
    (HEALTH_FLAGS as readonly string[]).includes(flag),
  );
  const merged: ProfileFormValues = { ...profileValues, healthFlags: flags };
  const profile = evaluateProfileBody(merged);
  if (profile.status === "invalid") {
    return {
      status: "invalid",
      message: profile.message,
      fieldErrors: profile.fieldErrors,
      profileValues: merged,
    };
  }
  const restrictions = evaluateRestrictions(readRestrictionsFormData(formData), text(formData, "dietDraft"));
  if (restrictions.status === "invalid") {
    return {
      status: "invalid",
      message: restrictions.message,
      fieldErrors: restrictions.fieldErrors,
      profileValues: merged,
    };
  }
  await persistDraftAction(DRAFT_KEYS.profile, JSON.stringify(merged));
  await persistDraftAction(DRAFT_KEYS.restrictions, JSON.stringify(restrictions.values));
  return { status: "success", profileValues: merged, restrictionValues: restrictions.values };
}

export async function saveWizardStoresAction(prev: StoresFormState, formData: FormData): Promise<StoresFormState> {
  const state = await saveStoresAction(prev, formData);
  if (state.status === "success") {
    await persistDraftAction(DRAFT_KEYS.stores, JSON.stringify(state.values));
  }
  return state;
}

export async function saveWizardBudgetAction(prev: BudgetFormState, formData: FormData): Promise<BudgetFormState> {
  const state = await saveBudgetAction(prev, formData);
  if (state.status === "success") {
    await persistDraftAction(DRAFT_KEYS.budget, JSON.stringify(state.values));
  }
  return state;
}
