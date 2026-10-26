import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Card, CardTitle } from "@/components/ui/card";
import { BudgetDiagnosisPanel } from "@/features/budget/components/basket-check";
import type { StatusTotals } from "@/features/pricing/cost";
import { formatGrosze, formatIsoDate, formatKcal, getMessages } from "@/i18n";
import type { PlanView } from "../view";
import { warningText } from "./texts";

const STATUS_TONE = { ok: "success", warnings: "info", over_budget: "danger" } as const;

function CostCell({ totals, testId }: { totals: StatusTotals; testId: string }) {
  const p = getMessages().pricing;
  const confirmed = totals.current + totals.stale;
  return (
    <td className="py-1.5 text-right align-top tabular-nums" data-testid={testId}>
      <span className="font-semibold">{formatGrosze(confirmed)}</span>
      {totals.stale > 0 ? (
        <span className="block text-xs text-muted">
          {p.status.stale.toLowerCase()}: {formatGrosze(totals.stale)}
        </span>
      ) : null}
      {totals.estimated > 0 ? (
        <span className="block text-xs text-warning">
          + {formatGrosze(totals.estimated)} ({p.status.estimated.toLowerCase()})
        </span>
      ) : null}
    </td>
  );
}

/** Trzy rodzaje kosztu — nigdy nie łączymy cen potwierdzonych i szacunkowych. */
export function PlanCosts({ view }: { view: PlanView }) {
  const c = getMessages().planner.costs;
  const rows = [
    { key: "used", label: c.used, hint: c.usedHint, totals: view.full.used },
    { key: "packages", label: c.packages, hint: c.packagesHint, totals: view.full.packages },
    { key: "basket", label: c.basket, hint: c.basketHint, totals: view.basket.packages },
  ] as const;
  return (
    <Card className="space-y-3" data-testid="plan-costs">
      <CardTitle>{c.title}</CardTitle>
      <table className="w-full text-sm">
        <thead className="sr-only">
          <tr>
            <th>{c.kind}</th>
            <th>{c.amount}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row" className="py-1.5 pr-3 text-left align-top font-normal">
                {row.label}
                <span className="block text-xs text-muted">{row.hint}</span>
              </th>
              <CostCell totals={row.totals} testId={`cost-${row.key}`} />
            </tr>
          ))}
        </tbody>
      </table>
      {view.basket.missingCount > 0 ? (
        <p className="text-xs text-danger">{getMessages().pricing.totals.missingCount(view.basket.missingCount)}</p>
      ) : null}
      <p className="text-xs text-subtle">{getMessages().pricing.totals.neverMixed}</p>
    </Card>
  );
}

export function PlanSummary({ view }: { view: PlanView }) {
  const t = getMessages();
  const m = t.planner.summary;
  const avgKcal = Math.round(view.days.reduce((s, d) => s + d.kcal, 0) / view.days.length);
  const within = view.days.filter((d) => d.withinTolerance).length;
  const warnings = view.warnings.filter((w) => w.code !== "no_budget");

  return (
    <div className="space-y-4" data-testid="plan-summary" data-status={view.status}>
      <Alert tone={STATUS_TONE[view.status]} title={m.status[view.status]}>
        <p>{m.priority}</p>
      </Alert>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: m.avgKcal, value: formatKcal(avgKcal), sub: m.target(formatKcal(view.targets.kcal)), testId: "avg-kcal" },
          { label: m.daysWithin, value: `${within} / ${view.days.length}`, sub: m.tolerance, testId: "days-within" },
          { label: m.prepTime, value: t.recipes.minutes(view.totalPrepMinutes), sub: m.perWeek, testId: "prep-time" },
          { label: m.leftovers, value: String(view.leftoverMeals), sub: m.leftoversHint, testId: "leftover-meals" },
        ].map((s) => (
          <div key={s.testId} className="min-w-0 rounded-lg border border-border bg-surface p-3">
            <dt className="text-xs text-muted">{s.label}</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums" data-testid={s.testId}>
              {s.value}
            </dd>
            <dd className="text-xs text-muted">{s.sub}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="min-w-0">
          <PlanCosts view={view} />
        </div>
        <div className="min-w-0 space-y-3">
          {view.budget ? (
            <BudgetDiagnosisPanel d={view.budget} names={view.names} />
          ) : (
            <Alert tone="info" data-testid="plan-no-budget">
              {m.noBudget}{" "}
              <Link href="/ustawienia/budzet" className="font-medium underline">
                {m.setBudget}
              </Link>
            </Alert>
          )}
        </div>
      </div>

      {warnings.length > 0 ? (
        <Card>
          <CardTitle>{m.warningsTitle}</CardTitle>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm" data-testid="plan-warnings">
            {warnings.map((w, i) => (
              <li key={i} data-code={w.code}>
                {warningText(w, view.names, view.recipeNames)}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <p className="text-xs text-muted" data-testid="plan-pricing-note">
        {m.pricedOn(formatIsoDate(view.pricedOn))}{" "}
        {view.selectedStores.length > 0 ? t.pricing.recipeCost.stores(view.selectedStores.join(", ")) : t.pricing.recipeCost.allStores}
        {view.importFile ? ` · ${t.pricing.recipeCost.importUsed(view.importFile)}` : ""}
      </p>
    </div>
  );
}
