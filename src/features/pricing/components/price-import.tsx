"use client";

import { useActionState, useEffect } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/form";
import { getMessages } from "@/i18n";
import { DRAFT_KEYS, useSessionDraft } from "@/lib/session-draft";
import { importPricesAction, type ImportFormState } from "../actions";

export function PriceImport() {
  const t = getMessages();
  const m = t.pricing.import;
  const [state, formAction, pending] = useActionState<ImportFormState, FormData>(importPricesAction, { status: "idle" });
  const draft = useSessionDraft(DRAFT_KEYS.priceImport);
  const stores = useSessionDraft(DRAFT_KEYS.stores);
  const { save } = draft;

  useEffect(() => {
    if (state.status === "done" && state.csv !== null) save(JSON.stringify({ fileName: state.fileName, csv: state.csv }));
  }, [state, save]);

  let active: { fileName: string } | null = null;
  try {
    active = draft.value ? (JSON.parse(draft.value) as { fileName: string }) : null;
  } catch {
    active = null;
  }

  return (
    <Card className="space-y-5" data-testid="price-import">
      <div>
        <CardTitle>{m.title}</CardTitle>
        <CardDescription>{m.lead}</CardDescription>
      </div>
      <form action={formAction} noValidate className="space-y-4">
        <Field id="price-file" label={m.fileLabel}>
          <input
            id="price-file"
            name="file"
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-primary-soft file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary"
          />
        </Field>
        <input type="hidden" name="storesDraft" value={stores.value} />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? m.submitting : m.submit}
          </Button>
          <a href="/szablon-cen.csv" download className="text-sm font-medium text-primary hover:underline">
            {m.template}
          </a>
        </div>
        <details className="text-xs text-muted">
          <summary className="cursor-pointer font-medium text-foreground">{m.columnsTitle}</summary>
          <p className="mt-2 leading-relaxed">{m.columns}</p>
        </details>
      </form>

      <div aria-live="polite" className="space-y-3">
        {state.status === "file_error" ? (
          <Alert tone="danger" data-testid="import-file-error">
            {state.message}
          </Alert>
        ) : null}
        {state.status === "done" ? (
          <div className="space-y-3" data-testid="import-report">
            <Alert tone={state.importedPrices + state.importedPromotions > 0 ? (state.errorCount > 0 ? "warning" : "success") : "danger"} title={m.reportTitle}>
              {m.summary(state.rowCount, state.importedPrices, state.importedPromotions, state.rejectedRows)}
              {state.importedPrices + state.importedPromotions === 0 ? ` ${m.noneImported}` : ""}
            </Alert>
            {state.errors.length > 0 ? (
              <div>
                <h3 className="mb-2 text-sm font-semibold">{m.errorsTitle(state.errorCount)}</h3>
                <div className="max-h-80 overflow-auto rounded-lg border border-border">
                  <table className="w-full text-sm" data-testid="import-errors">
                    <thead className="sticky top-0 bg-surface-muted text-left text-xs text-muted">
                      <tr>
                        <th className="px-3 py-2 font-medium">{m.line}</th>
                        <th className="px-3 py-2 font-medium">{m.column}</th>
                        <th className="px-3 py-2 font-medium">{m.message}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {state.errors.map((e, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 tabular-nums">{e.line}</td>
                          <td className="px-3 py-1.5 font-mono text-xs">{e.column ?? m.wholeRow}</td>
                          <td className="px-3 py-1.5">{e.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {state.errors.length < state.errorCount ? (
                  <p className="mt-1 text-xs text-muted">{m.moreErrors(state.errors.length, state.errorCount)}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        {active ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-primary-soft p-3 text-sm text-primary" data-testid="active-import">
            <span>{m.active(active.fileName)}</span>
            <Button
              variant="ghost"
              onClick={() => {
                draft.clear();
                window.location.reload();
              }}
            >
              {m.clear}
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
