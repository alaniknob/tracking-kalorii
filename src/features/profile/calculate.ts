import { calculateNutritionTargets, type NutritionResult } from "@/features/nutrition";
import { getMessages } from "@/i18n";
import { createProfileSchema, toNutritionInput, type ProfileField, type ProfileFormValues } from "./schema";

export type ProfileFormState =
  | { status: "idle"; values: ProfileFormValues }
  | {
      status: "invalid";
      values: ProfileFormValues;
      message: string;
      fieldErrors: Partial<Record<ProfileField, string>>;
    }
  | { status: "success"; values: ProfileFormValues; result: NutritionResult; mealsPerDay: number };

/**
 * Walidacja + obliczenia profilu, niezależne od Next.js (wywoływalne z akcji serwera,
 * przyszłego API dla aplikacji mobilnej i testów).
 */
export function evaluateProfile(values: ProfileFormValues, referenceDate: Date = new Date()): ProfileFormState {
  const parsed = createProfileSchema(referenceDate).safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<ProfileField, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as ProfileField | undefined;
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { status: "invalid", values, message: getMessages().validation.formInvalid, fieldErrors };
  }
  const input = toNutritionInput(parsed.data, referenceDate);
  return { status: "success", values, result: calculateNutritionTargets(input), mealsPerDay: input.mealsPerDay };
}
