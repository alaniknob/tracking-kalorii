import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { getMessages } from "@/i18n";
import type { InfeasibilityReason } from "../generate";
import type { RejectedSummary } from "../view";
import { reasonDetails, reasonTitle, remedyHref, remedyText } from "./texts";

export function InfeasibleDiagnosis({
  reasons,
  rejected,
}: {
  reasons: InfeasibilityReason[];
  rejected: RejectedSummary;
}) {
  const m = getMessages().planner.infeasible;
  return (
    <div className="space-y-3" data-testid="plan-infeasible">
      <Alert tone="danger" title={m.title}>
        {m.lead}
      </Alert>
      {reasons.map((reason, i) => (
        <div key={i} className="rounded-lg border border-border bg-surface p-4" data-testid={`infeasible-${reason.code}`}>
          <p className="text-sm font-semibold">{reasonTitle(reason)}</p>
          {reasonDetails(reason).length > 0 ? (
            <ul className="mt-1 space-y-0.5 text-xs text-muted">
              {reasonDetails(reason).map((line, j) => (
                <li key={j}>{line}</li>
              ))}
            </ul>
          ) : null}
          {reason.remedies.length > 0 ? (
            <>
              <p className="mt-3 text-sm font-medium">{m.remediesTitle}</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm" data-testid="plan-remedies">
                {reason.remedies.map((remedy, j) => (
                  <li key={j} data-code={remedy.code}>
                    {remedyText(remedy)}{" "}
                    <Link href={remedyHref(remedy)} className="font-medium text-primary hover:underline">
                      {m.change}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-3 text-sm">{m.noRemedy}</p>
          )}
        </div>
      ))}
      <p className="text-xs text-muted">{m.rejectedSummary(rejected.excluded, rejected.needsVerification, rejected.practical)}</p>
      <p className="text-xs text-subtle">{m.neverRelaxed}</p>
    </div>
  );
}
