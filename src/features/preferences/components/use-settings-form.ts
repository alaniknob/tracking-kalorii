"use client";

import { useActionState, useEffect, useMemo } from "react";
import type { z } from "zod";
import type { SettingsFormState } from "../evaluate";
import { useSessionDraft } from "@/lib/session-draft";

/**
 * Stan formularza ustawień: akcja serwera + wersja robocza tego ekranu (wypełnia pola)
 * + wersja robocza drugiego ekranu (wysyłana do serwera, który wykrywa konflikty między nimi).
 */
export function useSettingsForm<V, F extends string>(params: {
  action: (prev: SettingsFormState<V, F>, formData: FormData) => Promise<SettingsFormState<V, F>>;
  defaults: V;
  ownDraftKey: string;
  otherDraftKey: string;
  draftSchema: z.ZodType<V>;
}) {
  const { action, defaults, ownDraftKey, otherDraftKey, draftSchema } = params;
  const [state, formAction, pending] = useActionState(action, { status: "idle", values: defaults });
  const own = useSessionDraft(ownDraftKey);
  const other = useSessionDraft(otherDraftKey);
  const { save } = own;

  useEffect(() => {
    if (state.status === "success") save(JSON.stringify(state.values));
  }, [state, save]);

  const values = useMemo(() => {
    if (state.status !== "idle" || own.value === "") return state.values;
    try {
      const parsed = draftSchema.safeParse(JSON.parse(own.value));
      return parsed.success ? parsed.data : state.values;
    } catch {
      return state.values;
    }
  }, [state, own.value, draftSchema]);

  return { state, formAction, pending, values, otherDraft: other.value, formKey: JSON.stringify(values) };
}
