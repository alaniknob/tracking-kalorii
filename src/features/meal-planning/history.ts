"use server";

import { getAuthState } from "@/features/auth/session";
import { listPlanHistory, loadPlanAssignment, type PlanHistoryRow } from "@/features/auth/repository";
import { createServerSupabase } from "@/lib/supabase/server";

export type HistoryState =
  | { status: "not_configured" }
  | { status: "anonymous" }
  | { status: "ready"; plans: PlanHistoryRow[] };

export async function listHistoryAction(): Promise<HistoryState> {
  const auth = await getAuthState();
  if (auth.status === "not_configured") return { status: "not_configured" };
  if (auth.status !== "authenticated") return { status: "anonymous" };
  const supabase = await createServerSupabase();
  if (!supabase) return { status: "not_configured" };
  return { status: "ready", plans: await listPlanHistory(supabase, auth.userId) };
}

export async function restoreHistoryPlanAction(
  planId: string,
): Promise<{ status: "error" } | { status: "ok"; planDraft: string }> {
  const auth = await getAuthState();
  if (auth.status !== "authenticated") return { status: "error" };
  const supabase = await createServerSupabase();
  if (!supabase) return { status: "error" };
  const loaded = await loadPlanAssignment(supabase, auth.userId, planId);
  if (!loaded) return { status: "error" };
  await supabase.from("user_drafts").upsert({ user_id: auth.userId, current_plan_id: planId }, { onConflict: "user_id" });
  return {
    status: "ok",
    planDraft: JSON.stringify({
      startDate: loaded.startDate,
      generatedOn: loaded.generatedOn,
      fingerprint: loaded.fingerprint,
      assignment: loaded.assignment,
      planId,
    }),
  };
}
