"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { CheckboxLabel, describedBy, Field, Input } from "@/components/ui/form";
import { getMessages } from "@/i18n";
import { loginAction, registerAction } from "../actions";
import { ConfigMissing } from "./config-missing";

const idle = { status: "idle" as const, values: { email: "", password: "", consent: "" } };

export function AuthForm({ mode, configured }: { mode: "login" | "register"; configured: boolean }) {
  const t = getMessages();
  const a = t.auth;
  const action = mode === "register" ? registerAction : loginAction;
  const [state, formAction, pending] = useActionState(action, idle);
  const router = useRouter();

  useEffect(() => {
    if (state.status === "signed_in") router.push("/panel");
  }, [state, router]);

  if (!configured) return <ConfigMissing />;
  if (state.status === "not_configured") return <ConfigMissing />;

  let values = idle.values;
  if (state.status === "idle" || state.status === "invalid" || state.status === "error") values = state.values;
  const errors = state.status === "invalid" ? state.fieldErrors : {};
  const aria = (id: "email" | "password") => ({
    id,
    name: id,
    invalid: Boolean(errors[id]),
    "aria-describedby": describedBy(id, { error: errors[id] }),
  });

  return (
    <form action={formAction} noValidate className="max-w-md space-y-5" data-testid={`${mode}-form`}>
      {state.status === "invalid" || state.status === "error" ? (
        <Alert tone="danger" data-testid="auth-error">
          {state.message}
        </Alert>
      ) : null}
      {state.status === "confirm_email" ? (
        <Alert tone="success" data-testid="confirm-email">
          {a.confirmEmail(state.email)}
        </Alert>
      ) : null}

      <Field id="email" label={a.email} error={errors.email}>
        <Input type="email" autoComplete="email" defaultValue={values.email} {...aria("email")} />
      </Field>
      <Field id="password" label={a.password} error={errors.password} hint={mode === "register" ? a.passwordHint : undefined}>
        <Input type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} {...aria("password")} />
      </Field>
      {mode === "register" ? (
        <div>
          <CheckboxLabel name="consent" defaultChecked={values.consent === "on"}>
            {a.consentLabel}
          </CheckboxLabel>
          {errors.consent ? (
            <p id="consent-error" className="mt-1 text-xs font-medium text-danger">
              {errors.consent}
            </p>
          ) : null}
        </div>
      ) : null}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? a.submitting : mode === "register" ? a.registerSubmit : a.loginSubmit}
      </Button>
      <p className="text-sm text-muted">
        {mode === "register" ? (
          <>
            {a.hasAccount}{" "}
            <ButtonLink href="/logowanie" variant="ghost" className="h-auto px-0">
              {a.goLogin}
            </ButtonLink>
          </>
        ) : (
          <>
            {a.noAccount}{" "}
            <ButtonLink href="/rejestracja" variant="ghost" className="h-auto px-0">
              {a.goRegister}
            </ButtonLink>
          </>
        )}
      </p>
    </form>
  );
}
