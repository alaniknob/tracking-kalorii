"use client";

import { useCallback, useEffect, useState } from "react";

export const DRAFT_KEYS = {
  diet: "tk:draft:diet",
  restrictions: "tk:draft:restrictions",
} as const;

/**
 * Wersja robocza ustawień w sessionStorage — tylko ta karta przeglądarki, do czasu kont (etap 7).
 * Zawartość jest traktowana jako niezaufana i walidowana na serwerze przy każdym użyciu.
 */
export function useSessionDraft(key: string) {
  const [value, setValue] = useState("");

  useEffect(() => {
    setValue(window.sessionStorage.getItem(key) ?? "");
  }, [key]);

  const save = useCallback(
    (next: string) => {
      window.sessionStorage.setItem(key, next);
      setValue(next);
    },
    [key],
  );

  return { value, save };
}

export function clearAllDrafts() {
  for (const key of Object.values(DRAFT_KEYS)) window.sessionStorage.removeItem(key);
}
