import type { z } from "zod";

/**
 * Wersja robocza z sessionStorage przeglądarki to dane niezaufane: najpierw kształt surowych
 * wartości formularza, potem pełna walidacja tym samym schematem co formularz. Błędna → `null`.
 */
export function parseDraft<T>(json: string, rawSchema: z.ZodType, schema: z.ZodType<T>): T | null {
  if (typeof json !== "string" || json.trim() === "") return null;
  try {
    const raw = rawSchema.safeParse(JSON.parse(json));
    if (!raw.success) return null;
    const parsed = schema.safeParse(raw.data);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Pierwszy błąd Zod dla każdego pola formularza. */
export function fieldErrorsOf<Field extends string>(error: z.ZodError): Partial<Record<Field, string>> {
  const fieldErrors: Partial<Record<Field, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as Field | undefined;
    if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
  }
  return fieldErrors;
}
