"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { formatKcal, formatNumber, getMessages } from "@/i18n";
import { DRAFT_KEYS, readPlannerDrafts, writeDraft } from "@/lib/session-draft";
import { listSwapOptionsAction, swapMealAction } from "../actions";
import type { SwapOption } from "../generate";

export function MealSwap({ mealId, leftover }: { mealId: string; leftover: boolean }) {
  const t = getMessages().planner.swap;
  const [options, setOptions] = useState<SwapOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listSwapOptionsAction(readPlannerDrafts(), window.sessionStorage.getItem(DRAFT_KEYS.plan) ?? "", mealId)
      .then((result) => {
        if (cancelled) return;
        if (result.status === "ready") setOptions(result.options);
        else setOptions([]);
      })
      .catch(() => !cancelled && setOptions([]));
    return () => {
      cancelled = true;
    };
  }, [mealId]);

  const swap = async (option: SwapOption) => {
    if (option.current) return;
    setPending(true);
    setError(null);
    try {
      const result = await swapMealAction(
        readPlannerDrafts(),
        window.sessionStorage.getItem(DRAFT_KEYS.plan) ?? "",
        mealId,
        option.recipeId,
        option.factor,
      );
      if (result.status !== "ok") {
        setError(result.message);
        return;
      }
      writeDraft(DRAFT_KEYS.plan, result.planDraft);
      window.location.reload();
    } finally {
      setPending(false);
    }
  };

  const alternatives = (options ?? []).filter((option) => !option.current);
  return (
    <Card className="space-y-3" data-testid="meal-swap">
      <CardTitle>{t.title}</CardTitle>
      <p className="text-sm leading-relaxed text-muted">{t.lead}</p>
      {leftover ? <Alert tone="info">{t.leftoverNote}</Alert> : null}
      {error ? (
        <Alert tone="danger" data-testid="swap-error">
          {error}
        </Alert>
      ) : null}
      {options === null ? <p className="text-sm text-muted">{t.loading}</p> : null}
      {options && alternatives.length === 0 ? <p className="text-sm text-muted">{t.empty}</p> : null}
      {alternatives.length > 0 ? (
        <ul className="divide-y divide-border">
          {alternatives.map((option) => (
            <li key={option.recipeId} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="font-medium">{option.recipeName}</p>
                <p className="text-xs text-muted">
                  {t.portion(formatNumber(option.factor, undefined, 2))} · {formatKcal(option.kcal)}
                  {option.isDemo ? (
                    <>
                      {" "}
                      <Badge tone="warning">{getMessages().catalog.demoBadge}</Badge>
                    </>
                  ) : null}
                </p>
              </div>
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() => void swap(option)}
                data-testid={`swap-${option.recipeId}`}
              >
                {pending ? t.swapping : t.swap}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
