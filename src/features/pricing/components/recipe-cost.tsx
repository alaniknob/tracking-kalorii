"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SCREENS } from "@/config/routes";
import { getMessages } from "@/i18n";
import { readDrafts } from "@/lib/session-draft";
import { recipeCostAction, type RecipeCostResponse } from "../actions";
import { CostBreakdown } from "./cost-breakdown";

type State = { status: "loading" } | { status: "error" } | { status: "ready"; response: RecipeCostResponse };

/** Koszt przepisu liczony na serwerze z ustawień sklepów, budżetu i importu cen z tej karty. */
export function RecipeCost({ recipeId }: { recipeId: string }) {
  const t = getMessages();
  const r = t.pricing.recipeCost;
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const { stores, budget, priceImport } = readDrafts();
    recipeCostAction(recipeId, { stores, budget, priceImport })
      .then((response) => !cancelled && setState({ status: "ready", response }))
      .catch(() => !cancelled && setState({ status: "error" }));
    return () => {
      cancelled = true;
    };
  }, [recipeId]);

  return (
    <Card className="space-y-4" data-testid="recipe-cost">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{r.title}</h2>
        <Badge tone="warning">{t.pricing.demoBadge}</Badge>
      </div>
      {state.status === "loading" ? <p className="text-sm text-muted">{r.loading}</p> : null}
      {state.status === "error" ? <Alert tone="danger">{r.error}</Alert> : null}
      {state.status === "ready" && state.response.status === "ok" ? (
        <>
          <p className="text-xs text-muted">
            {state.response.storesConfigured ? r.stores(state.response.selectedStoreNames.join(", ")) : r.allStores}{" "}
            ·{" "}
            <Link href={SCREENS.stores.path} className="font-medium text-primary hover:underline">
              {r.chooseStores}
            </Link>
            {state.response.importInfo ? ` · ${r.importUsed(state.response.importInfo.fileName)}` : ""}
          </p>
          <CostBreakdown cost={state.response.cost} names={state.response.names} servings={state.response.servings} />
          {state.response.unconvertible.length > 0 ? <Alert tone="warning">{r.unconvertible}</Alert> : null}
        </>
      ) : null}
    </Card>
  );
}
