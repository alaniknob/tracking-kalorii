"use client";

import { useCallback, useEffect, useState } from "react";

export const DRAFT_KEYS = {
  diet: "tk:draft:diet",
  restrictions: "tk:draft:restrictions",
  stores: "tk:draft:stores",
  budget: "tk:draft:budget",
  priceImport: "tk:draft:price-import",
  /** Profil zapisywany tylko na wyraźne życzenie (zawiera dane o zdrowiu). */
  profile: "tk:draft:profile",
  pantry: "tk:draft:pantry",
  plan: "tk:draft:plan",
} as const;

/**
 * Wersja robocza ustawień w sessionStorage — tylko ta karta przeglądarki, do czasu kont (etap 7).
 * Zawartość jest traktowana jako niezaufana i walidowana na serwerze przy każdym użyciu.
 */
export function useSessionDraft(key: string) {
  const [value, setValue] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setValue(window.sessionStorage.getItem(key) ?? "");
    setLoaded(true);
  }, [key]);

  const save = useCallback(
    (next: string) => {
      window.sessionStorage.setItem(key, next);
      setValue(next);
    },
    [key],
  );

  const clear = useCallback(() => {
    window.sessionStorage.removeItem(key);
    setValue("");
  }, [key]);

  return { value, loaded, save, clear };
}

/** Wszystkie wersje robocze potrzebne do wyceny (sklepy, budżet, import cen, preferencje). */
export function readDrafts() {
  const get = (key: string) => window.sessionStorage.getItem(key) ?? "";
  return {
    stores: get(DRAFT_KEYS.stores),
    budget: get(DRAFT_KEYS.budget),
    priceImport: get(DRAFT_KEYS.priceImport),
    diet: get(DRAFT_KEYS.diet),
    restrictions: get(DRAFT_KEYS.restrictions),
  };
}

/** Wersje robocze generatora: wycena + profil i zapasy. */
export function readPlannerDrafts() {
  const get = (key: string) => window.sessionStorage.getItem(key) ?? "";
  return { ...readDrafts(), profile: get(DRAFT_KEYS.profile), pantry: get(DRAFT_KEYS.pantry) };
}

export function clearAllDrafts() {
  for (const key of Object.values(DRAFT_KEYS)) window.sessionStorage.removeItem(key);
}
