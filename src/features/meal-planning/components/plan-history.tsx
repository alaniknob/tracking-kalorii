"use client";

import { useEffect, useState } from "react";
import { ConfigMissing } from "@/features/auth/components/config-missing";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SCREENS } from "@/config/routes";
import type { PlanHistoryRow } from "@/features/auth/repository";
import { formatGrosze, formatIsoDate, formatKcal, getMessages } from "@/i18n";
import { DRAFT_KEYS, writeDraft } from "@/lib/session-draft";
import { listHistoryAction, restoreHistoryPlanAction } from "../history";

export function PlanHistory() {
  const t = getMessages();
  const h = t.auth.history;
  const [state, setState] = useState<"loading" | "not_configured" | "anonymous" | "ready">("loading");
  const [plans, setPlans] = useState<PlanHistoryRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void listHistoryAction().then((result) => {
      if (cancelled) return;
      if (result.status === "ready") {
        setPlans(result.plans);
        setState("ready");
      } else setState(result.status);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") return <p className="text-sm text-muted">{h.loading}</p>;
  if (state === "not_configured") return <ConfigMissing />;
  if (state === "anonymous") {
    return (
      <Alert tone="info" data-testid="history-guest">
        <p>{h.needLogin}</p>
        <ButtonLink href={SCREENS.login.path} className="mt-3">
          {t.auth.nav.login}
        </ButtonLink>
      </Alert>
    );
  }
  if (plans.length === 0) {
    return (
      <Alert tone="info" data-testid="history-empty">
        <p>{h.empty}</p>
        <ButtonLink href={SCREENS.generator.path} className="mt-3">
          {t.screens.generator.title}
        </ButtonLink>
      </Alert>
    );
  }

  return (
    <ul className="max-w-2xl space-y-3" data-testid="history-list">
      {plans.map((plan) => (
        <li key={plan.id}>
          <Card className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium first-letter:uppercase">{h.weekOf(formatIsoDate(plan.startDate))}</p>
              <p className="text-sm text-muted">
                {formatKcal(plan.targetKcal)} · {formatGrosze(Math.round(plan.basketPln * 100))} · {h.status[plan.status] ?? plan.status}
              </p>
              <p className="text-xs text-subtle">{h.created(formatIsoDate(plan.createdAt.slice(0, 10)))}</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                void restoreHistoryPlanAction(plan.id).then((result) => {
                  if (result.status === "ok") {
                    writeDraft(DRAFT_KEYS.plan, result.planDraft);
                    window.location.href = "/plan";
                  }
                });
              }}
            >
              {h.open}
            </Button>
          </Card>
        </li>
      ))}
    </ul>
  );
}
