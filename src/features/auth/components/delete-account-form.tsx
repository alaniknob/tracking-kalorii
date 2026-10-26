"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckboxLabel } from "@/components/ui/form";
import { getMessages } from "@/i18n";
import { clearAllDrafts } from "@/lib/session-draft";
import { deleteAccountAction, type AuthFormState } from "../actions";

const idle: AuthFormState = { status: "idle", values: { email: "", password: "", consent: "" } };

export function DeleteAccountForm() {
  const t = getMessages().auth.delete;
  const [state, formAction, pending] = useActionState(deleteAccountAction, idle);
  const router = useRouter();

  useEffect(() => {
    if (state.status === "deleted") {
      clearAllDrafts();
      router.push("/");
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4" data-testid="delete-account">
      <Alert tone="danger" title={t.title}>
        {t.body}
      </Alert>
      {state.status === "invalid" || state.status === "error" ? (
        <Alert tone="warning" data-testid="delete-error">
          {state.message}
        </Alert>
      ) : null}
      <CheckboxLabel name="confirm">{t.confirm}</CheckboxLabel>
      <Button type="submit" variant="secondary" disabled={pending} data-testid="delete-account-submit">
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}
