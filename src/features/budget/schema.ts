import { z } from "zod";
import { parsePlnToGrosze } from "@/features/pricing/money";
import { getMessages } from "@/i18n";

const v = getMessages().validation;

/** Zakres tygodniowego budżetu na żywność jednej osoby (zł). Poza nim wynik byłby bezużyteczny. */
export const BUDGET_LIMITS = { minPln: 20, maxPln: 5000 } as const;

/** Maks. liczba przygotowań jednego przepisu w tygodniu w sprawdzarce koszyka. */
export const MAX_TIMES_PER_WEEK = 14;

export interface BudgetFormValues {
  weeklyBudget: string;
  allowEstimates: string;
}

export type BudgetField = keyof BudgetFormValues;

export const DEFAULT_BUDGET_FORM_VALUES: BudgetFormValues = { weeklyBudget: "", allowEstimates: "on" };

export const budgetSettingsSchema = z.object({
  weeklyBudget: z.string().transform((value, ctx) => {
    if (value.trim() === "") {
      ctx.addIssue({ code: "custom", message: v.required });
      return z.NEVER;
    }
    const grosze = parsePlnToGrosze(value);
    if (grosze === null) {
      ctx.addIssue({ code: "custom", message: v.amountPln });
      return z.NEVER;
    }
    if (grosze < BUDGET_LIMITS.minPln * 100 || grosze > BUDGET_LIMITS.maxPln * 100) {
      ctx.addIssue({ code: "custom", message: v.range(BUDGET_LIMITS.minPln, BUDGET_LIMITS.maxPln, "zł") });
      return z.NEVER;
    }
    return grosze;
  }),
  allowEstimates: z.string().transform((value) => value === "on"),
}).transform((v): BudgetSettings => ({ weeklyBudgetGrosze: v.weeklyBudget, allowEstimates: v.allowEstimates }));

export interface BudgetSettings {
  weeklyBudgetGrosze: number;
  /** Czy przy braku cen potwierdzonych wolno użyć szacunkowych (zawsze pokazywanych osobno). */
  allowEstimates: boolean;
}

export const budgetDraftSchema = z.object({ weeklyBudget: z.string(), allowEstimates: z.string() });

export function readBudgetFormData(formData: FormData): BudgetFormValues {
  const str = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };
  return { weeklyBudget: str("weeklyBudget"), allowEstimates: str("allowEstimates") };
}
