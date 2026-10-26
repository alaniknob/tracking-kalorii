import { budgetDraftSchema, budgetSettingsSchema } from "@/features/budget/schema";
import { GOALS } from "@/features/nutrition/types";
import {
  DEFAULT_DIET_FORM_VALUES,
  dietDraftSchema,
  dietSettingsSchema,
  restrictionsDraftSchema,
  restrictionsSchema,
} from "@/features/preferences/schema";
import { evaluateProfile } from "@/features/profile/calculate";
import {
  DEFAULT_PROFILE_FORM_VALUES,
  profileDraftSchema,
  type ProfileFormValues,
} from "@/features/profile/schema";
import { storesDraftSchema, storesSettingsSchema } from "@/features/stores/schema";
import { parseDraft } from "@/lib/draft";
import { WIZARD_STEPS, type WizardStepId } from "./steps";

export type WizardDrafts = {
  profile: string;
  diet: string;
  restrictions: string;
  stores: string;
  budget: string;
};

export const EMPTY_WIZARD_DRAFTS: WizardDrafts = {
  profile: "",
  diet: "",
  restrictions: "",
  stores: "",
  budget: "",
};

/** Kolumna JSON z bazy — obiekt albo string. */
export function jsonColumnToDraft(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

export function wizardDraftsFromRow(row: {
  profile_json?: unknown;
  diet_json?: unknown;
  restrictions_json?: unknown;
  stores_json?: unknown;
  budget_json?: unknown;
} | null): WizardDrafts {
  if (!row) return EMPTY_WIZARD_DRAFTS;
  return {
    profile: jsonColumnToDraft(row.profile_json),
    diet: jsonColumnToDraft(row.diet_json),
    restrictions: jsonColumnToDraft(row.restrictions_json),
    stores: jsonColumnToDraft(row.stores_json),
    budget: jsonColumnToDraft(row.budget_json),
  };
}

export function parseProfileDraft(json: string): ProfileFormValues | null {
  if (json.trim() === "") return null;
  try {
    const parsed = profileDraftSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function hasChosenGoal(goal: string): boolean {
  return (GOALS as readonly string[]).includes(goal);
}

/** Walidacja danych ciała bez wymuszania wybranego celu (krok 1). */
export function evaluateProfileBody(values: ProfileFormValues, referenceDate: Date = new Date()) {
  return evaluateProfile(
    { ...values, goal: hasChosenGoal(values.goal) ? values.goal : "maintain" },
    referenceDate,
  );
}

export function isProfileBodyComplete(profileJson: string, dietJson: string, referenceDate?: Date): boolean {
  const values = parseProfileDraft(profileJson);
  if (!values) return false;
  if (evaluateProfileBody(values, referenceDate).status === "invalid") return false;
  return parseDraft(dietJson, dietDraftSchema, dietSettingsSchema) !== null;
}

export function isGoalComplete(profileJson: string, referenceDate?: Date): boolean {
  const values = parseProfileDraft(profileJson);
  if (!values || !hasChosenGoal(values.goal)) return false;
  return evaluateProfile(values, referenceDate).status !== "invalid";
}

export function isRestrictionsSaved(restrictionsJson: string): boolean {
  return parseDraft(restrictionsJson, restrictionsDraftSchema, restrictionsSchema) !== null;
}

export function isStoresComplete(storesJson: string): boolean {
  return parseDraft(storesJson, storesDraftSchema, storesSettingsSchema) !== null;
}

export function isBudgetComplete(budgetJson: string): boolean {
  return parseDraft(budgetJson, budgetDraftSchema, budgetSettingsSchema) !== null;
}

export function isWizardComplete(drafts: WizardDrafts, referenceDate?: Date): boolean {
  return firstIncompleteWizardPath(drafts, referenceDate) === null;
}

/** Pierwszy niedokończony krok albo `null`, gdy profil jest kompletny. */
export function firstIncompleteWizardPath(drafts: WizardDrafts, referenceDate?: Date): string | null {
  if (!isProfileBodyComplete(drafts.profile, drafts.diet, referenceDate)) return WIZARD_STEPS[0].path;
  if (!isGoalComplete(drafts.profile, referenceDate)) return WIZARD_STEPS[1].path;
  if (!isRestrictionsSaved(drafts.restrictions)) return WIZARD_STEPS[2].path;
  if (!isStoresComplete(drafts.stores)) return WIZARD_STEPS[3].path;
  if (!isBudgetComplete(drafts.budget)) return WIZARD_STEPS[4].path;
  return null;
}

export function resumePathForStep(step: WizardStepId, drafts: WizardDrafts, referenceDate?: Date): string | null {
  const resume = firstIncompleteWizardPath(drafts, referenceDate);
  if (resume === null) return "/";
  const current = WIZARD_STEPS.find((item) => item.id === step)!;
  const resumeIndex = WIZARD_STEPS.findIndex((item) => item.path === resume);
  const currentIndex = WIZARD_STEPS.findIndex((item) => item.path === current.path);
  if (currentIndex > resumeIndex) return resume;
  return null;
}

export function dietValuesFromDraft(json: string) {
  if (json.trim() === "") return { ...DEFAULT_DIET_FORM_VALUES };
  try {
    const parsed = dietDraftSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : { ...DEFAULT_DIET_FORM_VALUES };
  } catch {
    return { ...DEFAULT_DIET_FORM_VALUES };
  }
}

export function profileValuesFromDraft(json: string): ProfileFormValues {
  return parseProfileDraft(json) ?? { ...DEFAULT_PROFILE_FORM_VALUES };
}
