"use client";

import { useEffect, useState } from "react";
import { DRAFT_KEYS, readPlannerDrafts } from "@/lib/session-draft";
import { loadPlanAction, type LoadPlanState } from "../actions";

export type PlanLoad = { status: "loading" } | { status: "error" } | LoadPlanState;

/** Plan odtwarzany na serwerze z ustawień zapisanych w tej karcie. */
export function usePlan(): PlanLoad {
  const [state, setState] = useState<PlanLoad>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    loadPlanAction(readPlannerDrafts(), window.sessionStorage.getItem(DRAFT_KEYS.plan) ?? "")
      .then((result) => !cancelled && setState(result))
      .catch(() => !cancelled && setState({ status: "error" }));
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}
