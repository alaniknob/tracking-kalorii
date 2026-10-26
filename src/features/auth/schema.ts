import { z } from "zod";
import { getMessages } from "@/i18n";

const EMAIL_MAX = 254;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;

export interface AuthFormValues {
  email: string;
  password: string;
  consent: string;
}

export type AuthField = "email" | "password" | "consent";

export function createLoginSchema() {
  const v = getMessages().validation;
  const a = getMessages().auth.validation;
  return z.object({
    email: z.string().trim().min(1, { error: v.required }).max(EMAIL_MAX, { error: v.textTooLong(EMAIL_MAX) }).email({ error: a.email }),
    password: z.string().min(1, { error: v.required }).max(PASSWORD_MAX, { error: v.textTooLong(PASSWORD_MAX) }),
  });
}

export function createRegisterSchema() {
  const v = getMessages().validation;
  const a = getMessages().auth.validation;
  return z.object({
    email: z.string().trim().min(1, { error: v.required }).max(EMAIL_MAX, { error: v.textTooLong(EMAIL_MAX) }).email({ error: a.email }),
    password: z
      .string()
      .min(PASSWORD_MIN, { error: a.passwordLength(PASSWORD_MIN, PASSWORD_MAX) })
      .max(PASSWORD_MAX, { error: a.passwordLength(PASSWORD_MIN, PASSWORD_MAX) }),
    consent: z.string().refine((value) => value === "on", { error: a.consent }),
  });
}

export function readAuthFormData(formData: FormData): AuthFormValues {
  const text = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };
  return { email: text("email"), password: text("password"), consent: text("consent") };
}
