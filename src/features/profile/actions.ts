"use server";

import { evaluateProfile, type ProfileFormState } from "./calculate";
import { readProfileFormData } from "./schema";

/** Akcja serwera formularza profilu. Dane nie są zapisywane ani logowane (dane o zdrowiu). */
export async function calculateProfileAction(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  return evaluateProfile(readProfileFormData(formData));
}
