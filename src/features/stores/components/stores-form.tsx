"use client";

import { useActionState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckboxLabel, describedBy, Field, Textarea } from "@/components/ui/form";
import { getMessages } from "@/i18n";
import { DRAFT_KEYS, useSessionDraft } from "@/lib/session-draft";
import { saveStoresAction, type StoresFormState } from "../actions";
import { DEFAULT_STORES_FORM_VALUES, storesDraftSchema } from "../schema";
import { STORE_CHAINS } from "../stores";

export function StoresForm({
  action = saveStoresAction,
  continueHref,
}: {
  action?: typeof saveStoresAction;
  continueHref?: string;
} = {}) {
  const t = getMessages();
  const s = t.stores;
  const router = useRouter();
  const [state, formAction, pending] = useActionState<StoresFormState, FormData>(action, {
    status: "idle",
    values: DEFAULT_STORES_FORM_VALUES,
  });
  const draft = useSessionDraft(DRAFT_KEYS.stores);
  const { save } = draft;

  useEffect(() => {
    if (state.status !== "success") return;
    save(JSON.stringify(state.values));
    if (continueHref) router.push(continueHref);
  }, [state, save, continueHref, router]);

  const values = useMemo(() => {
    if (state.status !== "idle" || draft.value === "") return state.values;
    try {
      const parsed = storesDraftSchema.safeParse(JSON.parse(draft.value));
      return parsed.success ? parsed.data : state.values;
    } catch {
      return state.values;
    }
  }, [state, draft.value]);

  const errors = state.status === "invalid" ? state.fieldErrors : {};

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form key={JSON.stringify(values)} action={formAction} noValidate className="space-y-6">
        <p className="text-sm leading-relaxed text-muted">{s.draftNote}</p>
        {state.status === "invalid" ? (
          <Alert tone="danger" data-testid="form-error">
            {state.message}
          </Alert>
        ) : null}
        <Card>
          <fieldset aria-describedby="chains-hint">
            <legend className="text-sm font-semibold">{s.chainsLegend}</legend>
            <p id="chains-hint" className="mt-1 text-xs text-muted">
              {s.chainsHint}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {STORE_CHAINS.map((chain) => (
                <CheckboxLabel key={chain.id} name="chains" value={chain.id} defaultChecked={values.chains.includes(chain.id)}>
                  {chain.name}
                </CheckboxLabel>
              ))}
            </div>
            {errors.chains ? <p className="mt-2 text-xs font-medium text-danger">{errors.chains}</p> : null}
          </fieldset>
        </Card>
        <Card>
          <Field id="customStores" label={s.customLabel} hint={s.customHint} error={errors.customStores} optionalLabel={t.common.optional}>
            <Textarea
              id="customStores"
              name="customStores"
              defaultValue={values.customStores}
              invalid={Boolean(errors.customStores)}
              aria-describedby={describedBy("customStores", { hint: s.customHint, error: errors.customStores })}
            />
          </Field>
        </Card>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" disabled={pending} data-testid={continueHref ? "wizard-next" : undefined}>
            {pending ? s.submitting : continueHref ? getMessages().wizard.next : s.submit}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              draft.clear();
              window.location.reload();
            }}
          >
            {s.clear}
          </Button>
        </div>
      </form>

      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start" aria-live="polite">
        {state.status === "success" ? (
          <>
            <Alert tone="success" data-testid="stores-saved">
              {s.saved}
            </Alert>
            <Card>
              <h2 className="mb-3 text-sm font-semibold">{s.selectedTitle}</h2>
              <ul className="flex flex-wrap gap-2" data-testid="selected-stores">
                {state.selected.map((store) => (
                  <li key={store.id}>
                    <Badge tone="primary">
                      {store.name}
                      {store.kind === "custom" ? ` (${s.custom})` : ""}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}
