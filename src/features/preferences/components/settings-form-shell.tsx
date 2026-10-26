"use client";

import type { ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getMessages } from "@/i18n";
import type { SettingsFormState } from "../evaluate";
import { RulesSummary } from "./rules-summary";
import { clearAllDrafts } from "@/lib/session-draft";

/** Wspólny układ formularzy ustawień: komunikaty stanu, przycisk, podsumowanie reguł. */
export function SettingsFormShell<V, F extends string>({
  state,
  pending,
  formKey,
  action,
  otherDraftName,
  otherDraftValue,
  otherDraftNote,
  children,
}: {
  state: SettingsFormState<V, F>;
  pending: boolean;
  formKey: string;
  action: (formData: FormData) => void;
  otherDraftName: string;
  otherDraftValue: string;
  otherDraftNote: string;
  children: ReactNode;
}) {
  const t = getMessages();
  const p = t.preferences;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form key={formKey} action={action} noValidate className="space-y-6">
        <p className="text-sm leading-relaxed text-muted">{p.draftNote}</p>
        {state.status === "invalid" ? (
          <Alert tone="danger" data-testid="form-error">
            {state.message}
          </Alert>
        ) : null}
        {children}
        <input type="hidden" name={otherDraftName} value={otherDraftValue} />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? p.submitting : p.submit}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              clearAllDrafts();
              window.location.reload();
            }}
          >
            {p.clearDraft}
          </Button>
        </div>
      </form>

      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start" aria-live="polite">
        {state.status === "success" ? (
          <Alert tone="success" data-testid="settings-saved">
            {p.saved}
          </Alert>
        ) : null}
        {state.status === "conflict" ? (
          <Alert tone="danger" data-testid="settings-conflict">
            {t.validation.conflictsBlocking}
          </Alert>
        ) : null}
        {state.status === "success" || state.status === "conflict" ? (
          <RulesSummary rules={state.rules} otherDraftNote={state.usedOtherDraft ? otherDraftNote : undefined} />
        ) : null}
      </div>
    </div>
  );
}
