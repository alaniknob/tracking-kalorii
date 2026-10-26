import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { formatIsoDate, getMessages } from "@/i18n";
import type { PlanLoad } from "./use-plan";
import { InfeasibleDiagnosis } from "./infeasible-diagnosis";

/** Stany bez gotowego planu — zawsze z drogą do generatora (bez martwych przycisków). */
export function PlanStateNotice({ state }: { state: Exclude<PlanLoad, { status: "ready" }> }) {
  const m = getMessages().planner.week;
  const toGenerator = (
    <ButtonLink href="/generator" className="mt-3" data-testid="go-generator">
      {m.goToGenerator}
    </ButtonLink>
  );
  switch (state.status) {
    case "loading":
      return <p className="text-sm text-muted">{m.loading}</p>;
    case "error":
      return <Alert tone="danger">{m.error}</Alert>;
    case "no_plan":
      return (
        <Alert tone="info" title={m.emptyTitle} data-testid="plan-empty">
          <p>{m.empty}</p>
          {toGenerator}
        </Alert>
      );
    case "expired":
      return (
        <Alert tone="warning" title={m.expiredTitle} data-testid="plan-expired">
          <p>{m.expired(formatIsoDate(state.generatedOn))}</p>
          {toGenerator}
        </Alert>
      );
    case "settings_changed":
      return (
        <Alert tone="warning" title={m.changedTitle} data-testid="plan-settings-changed">
          <p>{m.changed}</p>
          {toGenerator}
        </Alert>
      );
    case "blocked":
      return (
        <Alert tone="warning" data-testid="plan-blocked">
          <p>{state.reason === "profile" ? getMessages().planner.generator.needsProfile : getMessages().planner.generator.rulesConflict}</p>
          {toGenerator}
        </Alert>
      );
    case "infeasible":
      return <InfeasibleDiagnosis reasons={state.reasons} rejected={state.rejected} />;
  }
}
