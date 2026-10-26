import { z } from "zod";
import { ALLERGEN_REACTIONS, EU_ALLERGENS, type AllergenCode, type AllergenExclusion } from "@/features/allergens";
import { getMessages } from "@/i18n";
import { parseTextList } from "@/lib/text-list";
import {
  DIET_STYLES,
  DIFFICULTY_LEVELS,
  KITCHEN_EQUIPMENT,
  PREFERENCE_LIMITS as L,
  PREP_TIME_OPTIONS,
} from "./diet-styles";

const v = getMessages().validation;

const textList = z
  .string()
  .max(L.textFieldMaxLength, { error: v.textTooLong(L.textFieldMaxLength) })
  .transform(parseTextList)
  .pipe(
    z
      .array(
        z
          .string()
          .min(L.textItemLength.min, { error: v.textItemLength(L.textItemLength.min, L.textItemLength.max) })
          .max(L.textItemLength.max, { error: v.textItemLength(L.textItemLength.min, L.textItemLength.max) }),
      )
      .max(L.textListMaxItems, { error: v.textListMax(L.textListMaxItems) }),
  );

const checkbox = z.string().transform((value) => value === "on");

// ---------- Ustawienia żywieniowe ----------

export interface DietFormValues {
  dietStyles: string[];
  dislikedProducts: string;
  preferredProducts: string;
  maxIngredients: string;
  maxPrepMinutes: string;
  difficulty: string;
  equipment: string[];
  useLeftovers: string;
}

export const DEFAULT_DIET_FORM_VALUES: DietFormValues = {
  dietStyles: ["traditional"],
  dislikedProducts: "",
  preferredProducts: "",
  maxIngredients: "",
  maxPrepMinutes: "30",
  difficulty: "medium",
  equipment: ["stove", "oven"],
  useLeftovers: "on",
};

export const dietSettingsSchema = z.object({
  dietStyles: z.array(z.enum(DIET_STYLES, { error: v.option })).min(1, { error: v.dietStylesRequired }),
  dislikedProducts: textList,
  preferredProducts: textList,
  maxIngredients: z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (value === "") return null;
      const n = Number(value);
      if (!Number.isInteger(n) || n < L.maxIngredients.min || n > L.maxIngredients.max) {
        ctx.addIssue({ code: "custom", message: v.range(L.maxIngredients.min, L.maxIngredients.max) });
        return z.NEVER;
      }
      return n;
    }),
  maxPrepMinutes: z
    .enum(PREP_TIME_OPTIONS, { error: v.option })
    .transform((value) => (value === "none" ? null : Number(value))),
  difficulty: z.enum(DIFFICULTY_LEVELS, { error: v.option }),
  equipment: z.array(z.enum(KITCHEN_EQUIPMENT, { error: v.option })),
  useLeftovers: checkbox,
});

export type DietSettings = z.output<typeof dietSettingsSchema>;
export type DietField = keyof DietFormValues;

export function readDietFormData(formData: FormData): DietFormValues {
  return {
    dietStyles: strings(formData, "dietStyles"),
    dislikedProducts: text(formData, "dislikedProducts"),
    preferredProducts: text(formData, "preferredProducts"),
    maxIngredients: text(formData, "maxIngredients"),
    maxPrepMinutes: text(formData, "maxPrepMinutes"),
    difficulty: text(formData, "difficulty"),
    equipment: strings(formData, "equipment"),
    useLeftovers: text(formData, "useLeftovers"),
  };
}

// ---------- Alergie i wykluczenia ----------

export interface RestrictionsFormValues {
  allergens: Record<AllergenCode, string>;
  otherAllergies: string;
  otherIntolerances: string;
  voluntaryExclusions: string;
  avoidTraces: string;
}

export const DEFAULT_RESTRICTIONS_FORM_VALUES: RestrictionsFormValues = {
  allergens: Object.fromEntries(EU_ALLERGENS.map((code) => [code, "none"])) as Record<AllergenCode, string>,
  otherAllergies: "",
  otherIntolerances: "",
  voluntaryExclusions: "",
  avoidTraces: "on",
};

export const restrictionsSchema = z
  .object({
    allergens: z.object(
      Object.fromEntries(EU_ALLERGENS.map((code) => [code, z.enum(ALLERGEN_REACTIONS, { error: v.option })])) as Record<
        AllergenCode,
        z.ZodEnum<{ none: "none"; allergy: "allergy"; intolerance: "intolerance" }>
      >,
    ),
    otherAllergies: textList,
    otherIntolerances: textList,
    voluntaryExclusions: textList,
    avoidTraces: checkbox,
  })
  .transform((data) => ({
    allergens: EU_ALLERGENS.flatMap((code): AllergenExclusion[] => {
      const reaction = data.allergens[code];
      if (reaction === "none") return [];
      return [{ code, kind: reaction, excludeTraces: reaction === "allergy" && data.avoidTraces }];
    }),
    otherAllergies: data.otherAllergies,
    otherIntolerances: data.otherIntolerances,
    voluntaryExclusions: data.voluntaryExclusions,
    avoidTraces: data.avoidTraces,
  }));

export type RestrictionsSettings = z.output<typeof restrictionsSchema>;
export type RestrictionsField = Exclude<keyof RestrictionsFormValues, "allergens"> | "allergens";

export const allergenFieldName = (code: AllergenCode) => `allergen_${code}`;

export function readRestrictionsFormData(formData: FormData): RestrictionsFormValues {
  return {
    allergens: Object.fromEntries(
      EU_ALLERGENS.map((code) => [code, text(formData, allergenFieldName(code)) || "none"]),
    ) as Record<AllergenCode, string>,
    otherAllergies: text(formData, "otherAllergies"),
    otherIntolerances: text(formData, "otherIntolerances"),
    voluntaryExclusions: text(formData, "voluntaryExclusions"),
    avoidTraces: text(formData, "avoidTraces"),
  };
}

// ---------- Wersje robocze z drugiego ekranu (sessionStorage) ----------

/** Kształt surowych wartości — dane z przeglądarki są niezaufane i walidowane jak formularz. */
export const dietDraftSchema = z.object({
  dietStyles: z.array(z.string()),
  dislikedProducts: z.string(),
  preferredProducts: z.string(),
  maxIngredients: z.string(),
  maxPrepMinutes: z.string(),
  difficulty: z.string(),
  equipment: z.array(z.string()),
  useLeftovers: z.string(),
}) satisfies z.ZodType<DietFormValues>;

export const restrictionsDraftSchema = z.object({
  allergens: z.record(z.enum(EU_ALLERGENS), z.string()),
  otherAllergies: z.string(),
  otherIntolerances: z.string(),
  voluntaryExclusions: z.string(),
  avoidTraces: z.string(),
}) satisfies z.ZodType<RestrictionsFormValues>;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function strings(formData: FormData, key: string): string[] {
  return formData.getAll(key).filter((value): value is string => typeof value === "string");
}
