"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { SCREENS } from "@/config/routes";
import { DRAFT_KEYS } from "@/features/preferences/components/use-session-draft";
import { getMessages } from "@/i18n";
import { evaluateRecipeFitAction, type RecipeFitResponse } from "../actions";
import type { RecipeFit, RecipeFitReason } from "../fit";

type FitState = { status: "loading" } | { status: "error" } | ({ status: "ready" } & RecipeFitResponse);

const FitContext = createContext<FitState>({ status: "loading" });

/** Jedno zapytanie do serwera dla wszystkich przepisów na ekranie, z ustawieniami z tej karty. */
export function RecipeFitProvider({ recipeIds, children }: { recipeIds: string[]; children: ReactNode }) {
  const [state, setState] = useState<FitState>({ status: "loading" });
  const idsKey = recipeIds.join(",");

  useEffect(() => {
    let cancelled = false;
    const diet = window.sessionStorage.getItem(DRAFT_KEYS.diet) ?? "";
    const restrictions = window.sessionStorage.getItem(DRAFT_KEYS.restrictions) ?? "";
    evaluateRecipeFitAction(idsKey.split(","), diet, restrictions)
      .then((response) => !cancelled && setState({ status: "ready", ...response }))
      .catch(() => !cancelled && setState({ status: "error" }));
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  return <FitContext.Provider value={state}>{children}</FitContext.Provider>;
}

const TONES = { excluded: "warning", needs_verification: "neutral", no_conflict_found: "success" } as const;

export function RecipeFitBadge({ recipeId }: { recipeId: string }) {
  const r = getMessages().recipes.fit;
  const state = useContext(FitContext);
  if (state.status !== "ready" || !state.hasSettings) return null;
  const fit = state.fits[recipeId];
  if (!fit) return null;
  return (
    <Badge tone={TONES[fit.status]} data-testid={`fit-${recipeId}`}>
      {r[fit.status]}
    </Badge>
  );
}

function reasonText(reason: RecipeFitReason): string {
  const t = getMessages();
  const r = t.recipes.fit.reasons;
  const p = t.preferences;
  switch (reason.code) {
    case "allergen":
      return r.allergen(
        p.allergens[reason.allergen],
        reason.declaration === "contains" ? t.catalog.contains : t.catalog.mayContain,
      );
    case "forbidden_group":
      return r.forbidden_group(p.foodGroups[reason.group]);
    case "custom_exclusion":
      return r.custom_exclusion(reason.label, p.exclusionKinds[reason.kind], reason.productName);
    case "allergen_data_incomplete":
      return r.allergen_data_incomplete;
    case "allergen_traces":
      return r.allergen_traces;
    case "custom_restriction_unverifiable":
      return r.custom_restriction_unverifiable(reason.label, p.exclusionKinds[reason.kind]);
  }
}

const ALERT_TONES: Record<RecipeFit["status"], "warning" | "info" | "success"> = {
  excluded: "warning",
  needs_verification: "info",
  no_conflict_found: "success",
};

export function RecipeFitDetails({ recipeId }: { recipeId: string }) {
  const t = getMessages();
  const r = t.recipes.fit;
  const state = useContext(FitContext);

  if (state.status === "loading") return <p className="text-sm text-muted">{r.loading}</p>;
  if (state.status === "error") return <Alert tone="danger">{r.error}</Alert>;
  if (!state.hasSettings) {
    return (
      <Alert tone="info">
        {r.noSettings}:{" "}
        <Link className="font-medium underline" href={SCREENS.nutritionSettings.path}>
          {t.screens.nutritionSettings.title}
        </Link>
        ,{" "}
        <Link className="font-medium underline" href={SCREENS.allergies.path}>
          {t.screens.allergies.title}
        </Link>
        .
      </Alert>
    );
  }
  const fit = state.fits[recipeId];
  if (!fit) return null;
  return (
    <Alert tone={ALERT_TONES[fit.status]} title={r[fit.status]} data-testid="fit-details">
      {fit.status === "no_conflict_found" ? (
        r.noConflictNote
      ) : (
        <ul className="list-disc space-y-1 pl-4">
          {fit.reasons.map((reason, i) => (
            <li key={i}>{reasonText(reason)}</li>
          ))}
        </ul>
      )}
    </Alert>
  );
}
