import { z } from "zod";
import { ageInYears } from "@/features/nutrition/age";
import { INPUT_LIMITS } from "@/features/nutrition/constants";
import { ACTIVITY_LEVELS, GOALS, HEALTH_FLAGS, SEXES, type NutritionInput } from "@/features/nutrition/types";
import { getMessages } from "@/i18n";

const v = getMessages().validation;

/** Liczba z pola tekstowego; akceptuje przecinek dziesiętny („72,5”). Pusty tekst = brak wartości. */
function toNumber(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const normalized = value.trim().replace(",", ".");
  if (normalized === "") return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function numberField(min: number, max: number, unit: string, { integer = false } = {}) {
  let schema = z.number({ error: (issue) => (issue.input === undefined ? v.required : v.number) });
  if (integer) schema = schema.int({ error: v.integer });
  return schema.min(min, { error: v.range(min, max, unit) }).max(max, { error: v.range(min, max, unit) });
}

const L = INPUT_LIMITS;

/**
 * Schemat profilu (etap 2). `referenceDate` pozwala deterministycznie liczyć wiek w testach.
 * Walidacja odrzuca wartości, które dałyby błędne lub niebezpieczne wyniki.
 */
export function createProfileSchema(referenceDate: Date = new Date()) {
  return z
    .object({
      birthDate: z
        .string({ error: v.required })
        .trim()
        .min(1, { error: v.required })
        .regex(/^\d{4}-\d{2}-\d{2}$/, { error: v.birthDateInvalid })
        .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()), { error: v.birthDateInvalid }),
      heightCm: z.preprocess(toNumber, numberField(L.heightCm.min, L.heightCm.max, "cm")),
      weightKg: z.preprocess(toNumber, numberField(L.weightKg.min, L.weightKg.max, "kg")),
      targetWeightKg: z.preprocess(toNumber, numberField(L.weightKg.min, L.weightKg.max, "kg").optional()),
      sex: z.enum(SEXES, { error: v.option }),
      activityLevel: z.enum(ACTIVITY_LEVELS, { error: v.option }),
      goal: z.enum(GOALS, { error: v.option }),
      mealsPerDay: z.preprocess(
        toNumber,
        numberField(L.mealsPerDay.min, L.mealsPerDay.max, "", { integer: true }),
      ),
      healthFlags: z.array(z.enum(HEALTH_FLAGS, { error: v.option })).default([]),
    })
    .superRefine((data, ctx) => {
      const birth = new Date(`${data.birthDate}T00:00:00Z`);
      if (!Number.isNaN(birth.getTime())) {
        if (birth > referenceDate) {
          ctx.addIssue({ code: "custom", path: ["birthDate"], message: v.birthDateFuture });
        } else {
          const age = ageInYears(birth, referenceDate);
          if (age < L.ageYears.min || age > L.ageYears.max) {
            ctx.addIssue({ code: "custom", path: ["birthDate"], message: v.ageRange(L.ageYears.min, L.ageYears.max) });
          }
        }
      }
      if (data.targetWeightKg !== undefined) {
        if (data.goal === "lose_weight" && data.targetWeightKg >= data.weightKg) {
          ctx.addIssue({ code: "custom", path: ["targetWeightKg"], message: v.targetBelowCurrent });
        }
        if ((data.goal === "gain_weight" || data.goal === "build_muscle") && data.targetWeightKg <= data.weightKg) {
          ctx.addIssue({ code: "custom", path: ["targetWeightKg"], message: v.targetAboveCurrent });
        }
      }
    });
}

export type ProfileInput = z.output<ReturnType<typeof createProfileSchema>>;
export type ProfileField = keyof ProfileInput;

export function toNutritionInput(profile: ProfileInput, referenceDate: Date = new Date()): NutritionInput {
  return {
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
    ageYears: ageInYears(new Date(`${profile.birthDate}T00:00:00Z`), referenceDate),
    sex: profile.sex,
    activityLevel: profile.activityLevel,
    goal: profile.goal,
    // Masa docelowa ma znaczenie tylko dla celów zmiany masy.
    targetWeightKg: profile.goal === "maintain" ? undefined : profile.targetWeightKg,
    healthFlags: profile.healthFlags,
    mealsPerDay: profile.mealsPerDay,
  };
}

/** Surowe wartości formularza (do ponownego wypełnienia pól po walidacji). */
export interface ProfileFormValues {
  birthDate: string;
  heightCm: string;
  weightKg: string;
  targetWeightKg: string;
  sex: string;
  activityLevel: string;
  goal: string;
  mealsPerDay: string;
  healthFlags: string[];
}

export const DEFAULT_PROFILE_FORM_VALUES: ProfileFormValues = {
  birthDate: "",
  heightCm: "",
  weightKg: "",
  targetWeightKg: "",
  sex: "unspecified",
  activityLevel: "light",
  goal: "maintain",
  mealsPerDay: "4",
  healthFlags: [],
};

export function readProfileFormData(formData: FormData): ProfileFormValues {
  const text = (key: keyof ProfileFormValues) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };
  return {
    birthDate: text("birthDate"),
    heightCm: text("heightCm"),
    weightKg: text("weightKg"),
    targetWeightKg: text("targetWeightKg"),
    sex: text("sex"),
    activityLevel: text("activityLevel"),
    goal: text("goal"),
    mealsPerDay: text("mealsPerDay"),
    healthFlags: formData.getAll("healthFlags").filter((value): value is string => typeof value === "string"),
  };
}
