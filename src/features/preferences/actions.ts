"use server";

import { evaluateDietSettings, evaluateRestrictions, type DietFormState, type RestrictionsFormState } from "./evaluate";
import { readDietFormData, readRestrictionsFormData } from "./schema";

function draft(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** Dane o alergiach są danymi o zdrowiu — nie są zapisywane ani logowane na serwerze. */
export async function saveDietSettingsAction(_prev: DietFormState, formData: FormData): Promise<DietFormState> {
  return evaluateDietSettings(readDietFormData(formData), draft(formData, "restrictionsDraft"));
}

export async function saveRestrictionsAction(
  _prev: RestrictionsFormState,
  formData: FormData,
): Promise<RestrictionsFormState> {
  return evaluateRestrictions(readRestrictionsFormData(formData), draft(formData, "dietDraft"));
}
