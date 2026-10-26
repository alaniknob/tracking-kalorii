"use client";

import { useCallback, useEffect, useState } from "react";
import { DRAFT_KEYS } from "./draft-keys";

export { DRAFT_KEYS };

type PersistFn = (key: string, value: string) => void;

let persistHook: PersistFn | null = null;

/** Podłączenie zapisu do konta (etap 7). Bez konta hook jest pusty. */
export function setDraftPersistHook(fn: PersistFn | null) {
  persistHook = fn;
}

export function writeDraft(key: string, value: string, options: { persist?: boolean } = {}) {
  if (typeof window === "undefined") return;
  if (value === "") window.sessionStorage.removeItem(key);
  else window.sessionStorage.setItem(key, value);
  if (options.persist !== false) persistHook?.(key, value);
}

/**
 * Wersja robocza ustawień w sessionStorage — karta przeglądarki. Przy zalogowaniu
 * te same klucze są zapisywane w Supabase (RLS właściciela).
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
      writeDraft(key, next);
      setValue(next);
    },
    [key],
  );

  const clear = useCallback(() => {
    writeDraft(key, "");
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

export function readAllDrafts() {
  const get = (key: string) => window.sessionStorage.getItem(key) ?? "";
  return {
    profile: get(DRAFT_KEYS.profile),
    diet: get(DRAFT_KEYS.diet),
    restrictions: get(DRAFT_KEYS.restrictions),
    stores: get(DRAFT_KEYS.stores),
    budget: get(DRAFT_KEYS.budget),
    pantry: get(DRAFT_KEYS.pantry),
    priceImport: get(DRAFT_KEYS.priceImport),
    shoppingChecked: get(DRAFT_KEYS.shoppingChecked),
    plan: get(DRAFT_KEYS.plan),
  };
}

export function applyDrafts(drafts: Record<string, string>) {
  const map: Record<string, string> = {
    profile: DRAFT_KEYS.profile,
    diet: DRAFT_KEYS.diet,
    restrictions: DRAFT_KEYS.restrictions,
    stores: DRAFT_KEYS.stores,
    budget: DRAFT_KEYS.budget,
    pantry: DRAFT_KEYS.pantry,
    priceImport: DRAFT_KEYS.priceImport,
    shoppingChecked: DRAFT_KEYS.shoppingChecked,
    plan: DRAFT_KEYS.plan,
  };
  for (const [field, key] of Object.entries(map)) {
    const value = drafts[field] ?? "";
    writeDraft(key, value, { persist: false });
  }
}

export function clearAllDrafts() {
  for (const key of Object.values(DRAFT_KEYS)) writeDraft(key, "");
}

export function hasLocalDrafts(): boolean {
  if (typeof window === "undefined") return false;
  return Object.values(DRAFT_KEYS).some((key) => (window.sessionStorage.getItem(key) ?? "") !== "");
}
