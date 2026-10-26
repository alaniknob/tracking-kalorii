"use client";

import { useActionState, useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { CostBreakdown } from "@/features/pricing/components/cost-breakdown";
import type { NameMaps } from "@/features/pricing/names";
import { formatGrosze, getMessages } from "@/i18n";
import { readDrafts } from "@/lib/session-draft";
import { checkBasketAction, type BasketCheckState } from "../actions";
import type { BudgetDiagnosis, BudgetSuggestion } from "../diagnose";
import { MAX_TIMES_PER_WEEK } from "../schema";

const STATUS_TONE = { within: "success", within_with_estimates: "info", incomplete: "warning", over: "danger" } as const;

function suggestionText(s: BudgetSuggestion, names: NameMaps): string {
  const m = getMessages().budget.check.suggestion;
  const product = (id: string) => names.products[id] ?? id;
  const store = (id: string) => names.stores[id] ?? id;
  switch (s.code) {
    case "switch_store":
      return m.switch_store(product(s.productId), store(s.storeId), formatGrosze(s.savingGrosze));
    case "cheaper_alternative": {
      const unit = getMessages().pricing.perUnit(names.units[s.productId] === "ml" ? "l" : "kg");
      return m.cheaper_alternative(
        product(s.productId),
        product(s.alternativeId),
        store(s.storeId),
        `${formatGrosze(s.unitPriceGrosze)}${unit}`,
        `${formatGrosze(s.alternativeUnitPriceGrosze)}${unit}`,
      );
    }
    case "reduce_leftovers":
      return m.reduce_leftovers(formatGrosze(s.leftoverValueGrosze));
    case "missing_prices":
      return m.missing_prices(s.count);
    case "allow_estimates":
      return m.allow_estimates(s.count);
    case "change_recipes":
      return m.change_recipes;
  }
}

export function BudgetDiagnosisPanel({ d, names }: { d: BudgetDiagnosis; names: NameMaps }) {
  const c = getMessages().budget.check;
  const p = getMessages().pricing;
  return (
    <div className="space-y-3" data-testid="budget-diagnosis" data-status={d.status}>
      <Alert tone={STATUS_TONE[d.status]} title={c.status[d.status]}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 tabular-nums">
          <dt>{c.budget}</dt>
          <dd className="text-right font-medium">{formatGrosze(d.budgetGrosze)}</dd>
          <dt>{p.totals.confirmed}</dt>
          <dd className="text-right">{formatGrosze(d.confirmedGrosze)}</dd>
          {d.estimatedGrosze > 0 ? (
            <>
              <dt>{p.totals.estimated}</dt>
              <dd className="text-right">{formatGrosze(d.estimatedGrosze)}</dd>
            </>
          ) : null}
          <dt>{d.requiredIsLowerBound ? c.requiredLowerBound : c.required}</dt>
          <dd className="text-right font-medium" data-testid="required-budget">
            {formatGrosze(d.requiredGrosze)}
          </dd>
          {d.shortfallGrosze > 0 ? (
            <>
              <dt>{c.shortfall}</dt>
              <dd className="text-right font-semibold" data-testid="shortfall">
                {formatGrosze(d.shortfallGrosze)}
              </dd>
            </>
          ) : null}
          <dt>{c.leftovers}</dt>
          <dd className="text-right">{formatGrosze(d.leftoverValueGrosze)}</dd>
        </dl>
      </Alert>
      {d.status === "over" && d.topCosts.length > 0 ? (
        <p className="text-sm">
          <span className="font-medium">{c.topCosts}:</span>{" "}
          {d.topCosts.map((x) => `${names.products[x.productId] ?? x.productId} (${formatGrosze(x.packagesCostGrosze)})`).join(", ")}
        </p>
      ) : null}
      {d.suggestions.length > 0 ? (
        <div>
          <h3 className="mb-1 text-sm font-semibold">{c.suggestionsTitle}</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm" data-testid="budget-suggestions">
            {d.suggestions.map((s, i) => (
              <li key={i}>{suggestionText(s, names)}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function BasketCheck({ recipes }: { recipes: { id: string; name: string; servings: number }[] }) {
  const t = getMessages();
  const c = t.budget.check;
  const [state, formAction, pending] = useActionState<BasketCheckState, FormData>(checkBasketAction, { status: "idle" });
  const [drafts, setDrafts] = useState<ReturnType<typeof readDrafts> | null>(null);
  const [times, setTimes] = useState<Record<string, string>>({});

  useEffect(() => {
    setDrafts(readDrafts());
  }, []);

  return (
    <Card className="space-y-5" data-testid="basket-check">
      <div>
        <CardTitle>{c.title}</CardTitle>
        <CardDescription>{c.lead}</CardDescription>
      </div>
      <form
        action={(formData) => {
          const current = readDrafts();
          setDrafts(current);
          formData.set("storesDraft", current.stores);
          formData.set("budgetDraft", current.budget);
          formData.set("priceImportDraft", current.priceImport);
          formData.set("dietDraft", current.diet);
          formData.set("restrictionsDraft", current.restrictions);
          formAction(formData);
        }}
        noValidate
        className="space-y-4"
      >
        <ul className="grid gap-3 lg:grid-cols-2">
          {recipes.map((recipe) => (
            <li key={recipe.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
              <label htmlFor={`times-${recipe.id}`} className="text-sm">
                {recipe.name}
                <span className="block text-xs text-muted">{t.recipes.servings(recipe.servings)}</span>
              </label>
              <span className="flex items-center gap-2">
                <Input
                  id={`times-${recipe.id}`}
                  name={`times:${recipe.id}`}
                  type="number"
                  min={0}
                  max={MAX_TIMES_PER_WEEK}
                  value={times[recipe.id] ?? "0"}
                  onChange={(e) => setTimes((prev) => ({ ...prev, [recipe.id]: e.target.value }))}
                  aria-label={c.timesLabel(recipe.name)}
                  className="h-9 w-16 text-center"
                />
                <span className="text-xs whitespace-nowrap text-muted">{c.timesSuffix}</span>
              </span>
            </li>
          ))}
        </ul>
        <Button type="submit" disabled={pending}>
          {pending ? c.submitting : c.submit}
        </Button>
      </form>

      <div aria-live="polite" className="space-y-4">
        {state.status === "no_budget" || (state.status === "idle" && drafts && drafts.budget === "") ? (
          <Alert tone="info" data-testid="basket-no-budget">
            {c.noBudget}
          </Alert>
        ) : null}
        {state.status === "invalid" ? (
          <Alert tone="danger" data-testid="basket-error">
            {state.message}
          </Alert>
        ) : null}
        {state.status === "done" ? (
          <>
            {state.excludedRecipes.length > 0 ? (
              <Alert tone="danger" data-testid="basket-excluded">
                {c.excludedRecipes(
                  state.excludedRecipes.map((id) => state.selection.find((s) => s.recipeId === id)?.name ?? id).join(", "),
                )}
              </Alert>
            ) : null}
            <BudgetDiagnosisPanel d={state.diagnosis} names={state.names} />
            {!state.hasRules ? <p className="text-xs text-muted">{c.noRulesNote}</p> : null}
            <CostBreakdown cost={state.cost} names={state.names} />
            {state.unconvertible.length > 0 ? <Alert tone="warning">{t.pricing.recipeCost.unconvertible}</Alert> : null}
          </>
        ) : null}
      </div>
    </Card>
  );
}
