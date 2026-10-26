"use client";

import { useEffect } from "react";
import { applyDrafts, hasLocalDrafts, readAllDrafts, setDraftPersistHook } from "@/lib/session-draft";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { loadAccountDraftsAction, persistAllDraftsAction, persistDraftAction } from "../persist";

/**
 * Po zalogowaniu: konto jest źródłem prawdy, puste konto przejmuje wersje z tej karty.
 * Każdy dalszy zapis wersji roboczej idzie też do bazy (RLS właściciela).
 */
export function AccountSync() {
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    setDraftPersistHook((key, value) => {
      void persistDraftAction(key, value);
    });
    let cancelled = false;
    void (async () => {
      const remote = await loadAccountDraftsAction();
      if (cancelled || remote.status !== "ready") return;
      if (remote.empty) {
        if (hasLocalDrafts()) await persistAllDraftsAction(readAllDrafts());
        return;
      }
      applyDrafts(remote.drafts);
    })();
    return () => {
      cancelled = true;
      setDraftPersistHook(null);
    };
  }, []);
  return null;
}
