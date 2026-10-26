import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import type { NutritionResult } from "@/features/nutrition/types";
import { formatGrams, formatKcal, formatNumber, formatPercent, getMessages } from "@/i18n";

function Metric({ label, value, hint, emphasis }: { label: string; value: string; hint: string; emphasis?: boolean }) {
  return (
    <div
      className={
        emphasis ? "rounded-lg bg-primary p-4 text-primary-foreground" : "rounded-lg border border-border bg-surface p-4"
      }
    >
      <p className={emphasis ? "text-xs font-medium opacity-80" : "text-xs font-medium text-muted"}>{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      <p className={emphasis ? "mt-1 text-xs opacity-80" : "mt-1 text-xs text-muted"}>{hint}</p>
    </div>
  );
}

export function NutritionSummary({ result, mealsPerDay }: { result: NutritionResult; mealsPerDay: number }) {
  const t = getMessages();
  const n = t.nutrition;

  if (result.kind === "restricted") {
    return (
      <Alert tone="warning" title={n.restrictedTitle} data-testid="nutrition-restricted">
        <ul className="list-disc space-y-1.5 pl-4">
          {result.reasons.map((reason) => (
            <li key={reason}>{n.restricted[reason]}</li>
          ))}
        </ul>
      </Alert>
    );
  }

  const warnings = result.warnings.map((warning) => (
    <li key={warning}>{n.warnings[warning]}</li>
  ));

  return (
    <Card className="space-y-5" data-testid="nutrition-result">
      <h2 className="text-lg font-semibold tracking-tight">{n.resultTitle}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Metric label={n.bmr.label} value={formatKcal(result.bmrKcal)} hint={n.bmr.hint} />
        <Metric label={n.tdee.label} value={formatKcal(result.tdeeKcal)} hint={n.tdee.hint} />
        {result.kind === "ok" ? (
          <Metric
            emphasis
            label={n.goalKcal.label}
            value={formatKcal(result.goalCalories.kcal)}
            hint={n.adjustment(result.goalCalories.adjustmentKcal)}
          />
        ) : null}
        <Metric label={n.plannedKcal.label} value={n.plannedKcal.empty} hint={n.plannedKcal.hint} />
      </div>
      <p className="text-sm text-muted">
        {n.bmi}: <span className="font-medium text-foreground">{formatNumber(result.bmi, undefined, 1)}</span>
      </p>

      {result.kind === "goal_blocked" ? (
        <Alert tone="warning" title={n.blockedTitle} data-testid="nutrition-blocked">
          {n.blocked[result.reason]}
        </Alert>
      ) : (
        <div>
          <h3 className="mb-2 text-sm font-semibold">{n.macrosTitle}</h3>
          <dl className="divide-y divide-border rounded-lg border border-border text-sm">
            {(
              [
                [n.protein, result.macros.proteinG, result.macros.energyShare.protein],
                [n.fat, result.macros.fatG, result.macros.energyShare.fat],
                [n.carbohydrates, result.macros.carbohydratesG, result.macros.energyShare.carbohydrates],
              ] as const
            ).map(([label, grams, share]) => (
              <div key={label} className="flex items-center justify-between px-4 py-2.5">
                <dt className="text-muted">{label}</dt>
                <dd className="font-medium">
                  {formatGrams(grams)} <span className="ml-1 text-xs font-normal text-subtle">{formatPercent(share)}</span>
                </dd>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-2.5">
              <dt className="text-muted">{n.fiber}</dt>
              <dd className="font-medium">{formatGrams(result.macros.fiberG)}</dd>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <dt className="text-muted">{n.perMeal(mealsPerDay)}</dt>
              <dd className="font-medium">{formatKcal(result.kcalPerMeal)}</dd>
            </div>
          </dl>
        </div>
      )}

      {warnings.length > 0 ? (
        <Alert tone="info">
          <ul className="list-disc space-y-1 pl-4">{warnings}</ul>
        </Alert>
      ) : null}
      <p className="text-xs leading-relaxed text-subtle">{t.common.estimateDisclaimer}</p>
    </Card>
  );
}
