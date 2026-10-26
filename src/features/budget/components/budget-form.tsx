"use client";

import { useActionState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckboxLabel, describedBy, Field, Input } from "@/components/ui/form";
import { formatGrosze, getMessages } from "@/i18n";
import { DRAFT_KEYS, useSessionDraft } from "@/lib/session-draft";
import { saveBudgetAction, type BudgetFormState } from "../actions";
import { BUDGET_LIMITS, budgetDraftSchema, DEFAULT_BUDGET_FORM_VALUES } from "../schema";

export function BudgetForm({
  action = saveBudgetAction,
  continueHref,
}: {
  action?: typeof saveBudgetAction;
  continueHref?: string;
} = {}) {
  const b = getMessages().budget;
  const router = useRouter();
  const [state, formAction, pending] = useActionState<BudgetFormState, FormData>(action, {
    status: "idle",
    values: DEFAULT_BUDGET_FORM_VALUES,
  });
  const draft = useSessionDraft(DRAFT_KEYS.budget);
  const { save } = draft;

  useEffect(() => {
    if (state.status !== "success") return;
    save(JSON.stringify(state.values));
    if (continueHref) router.push(continueHref);
  }, [state, save, continueHref, router]);

  const values = useMemo(() => {
    if (state.status !== "idle" || draft.value === "") return state.values;
    try {
      const parsed = budgetDraftSchema.safeParse(JSON.parse(draft.value));
      return parsed.success ? parsed.data : state.values;
    } catch {
      return state.values;
    }
  }, [state, draft.value]);

  const error = state.status === "invalid" ? state.fieldErrors.weeklyBudget : undefined;
  const hint = b.amountHint(BUDGET_LIMITS.minPln, BUDGET_LIMITS.maxPln);

  return (
    <form key={JSON.stringify(values)} action={formAction} noValidate className="space-y-4">
      <Card className="space-y-5">
        <p className="text-sm leading-relaxed text-muted">{b.draftNote}</p>
        {state.status === "invalid" ? (
          <Alert tone="danger" data-testid="form-error">
            {state.message}
          </Alert>
        ) : null}
        <Field id="weeklyBudget" label={b.amountLabel} hint={hint} error={error}>
          <div className="flex items-center gap-2">
            <Input
              id="weeklyBudget"
              name="weeklyBudget"
              inputMode="decimal"
              className="max-w-40"
              defaultValue={values.weeklyBudget}
              invalid={Boolean(error)}
              aria-describedby={describedBy("weeklyBudget", { hint, error })}
            />
            <span className="text-sm text-muted">zł</span>
          </div>
        </Field>
        <CheckboxLabel name="allowEstimates" defaultChecked={values.allowEstimates === "on"}>
          {b.allowEstimates}
        </CheckboxLabel>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending} data-testid={continueHref ? "wizard-next" : undefined}>
            {pending ? b.submitting : continueHref ? getMessages().wizard.finish : b.submit}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              draft.clear();
              window.location.reload();
            }}
          >
            {b.clear}
          </Button>
        </div>
        {state.status === "success" ? (
          <Alert tone="success" data-testid="budget-saved">
            {b.saved(formatGrosze(state.settings.weeklyBudgetGrosze))}
          </Alert>
        ) : null}
      </Card>
    </form>
  );
}
