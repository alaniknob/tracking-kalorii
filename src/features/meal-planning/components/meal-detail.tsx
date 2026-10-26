"use client";

import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { formatGrams, formatKcal, formatNumber, formatWeekdayDate, getMessages } from "@/i18n";
import type { MealView, PlanView } from "../view";
import { MealSwap } from "./meal-swap";
import { PlanStateNotice } from "./plan-states";
import { usePlan } from "./use-plan";
import { mealCostText } from "./week-view";

function mealLabel(view: PlanView, id: string): string {
  const meal = view.meals.find((m) => m.id === id);
  if (!meal) return id;
  return `${formatWeekdayDate(meal.date)}, ${getMessages().planner.slots[meal.slot].toLowerCase()}`;
}

function Detail({ meal, view }: { meal: MealView; view: PlanView }) {
  const t = getMessages();
  const m = t.planner.meal;
  const r = t.recipes;
  return (
    <div className="space-y-6" data-testid="meal-detail">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="primary">{t.planner.slots[meal.slot]}</Badge>
        <span className="text-sm text-muted first-letter:uppercase">{formatWeekdayDate(meal.date)}</span>
        {meal.recipeIsDemo ? <Badge tone="warning">{t.catalog.demoBadge}</Badge> : null}
        <Badge>{r.reliability[meal.reliability]}</Badge>
      </div>
      <h2 className="text-2xl font-semibold tracking-tight" data-testid="meal-recipe-name">
        {meal.recipeName}
      </h2>

      {meal.leftoverOfId ? (
        <Alert tone="info" data-testid="meal-leftover-of">
          {m.leftoverOf(mealLabel(view, meal.leftoverOfId))}{" "}
          <Link href={`/plan/posilki/${meal.leftoverOfId}`} className="font-medium underline">
            {m.openMeal}
          </Link>
        </Alert>
      ) : null}
      {meal.leftoverForId ? (
        <Alert tone="info" data-testid="meal-leftover-for">
          {m.leftoverFor(mealLabel(view, meal.leftoverForId))}{" "}
          <Link href={`/plan/posilki/${meal.leftoverForId}`} className="font-medium underline">
            {m.openMeal}
          </Link>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-6">
          <Card className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="meal-nutrition">
              {[
                { label: r.energy, value: formatKcal(meal.kcal) },
                { label: t.nutrition.protein, value: formatGrams(meal.proteinG, undefined, 1) },
                { label: t.nutrition.fat, value: formatGrams(meal.fatG, undefined, 1) },
                { label: t.nutrition.carbohydrates, value: formatGrams(meal.carbohydratesG, undefined, 1) },
              ].map((s) => (
                <div key={s.label} className="min-w-0">
                  <dt className="text-xs text-muted">{s.label}</dt>
                  <dd className="font-semibold tabular-nums">{s.value}</dd>
                </div>
              ))}
            </dl>
            <p className="text-sm text-muted">
              {m.portion(formatNumber(meal.factor, undefined, 2))} · {m.ofRecipe(r.servings(meal.recipeServings))} ·{" "}
              {meal.leftoverOfId ? m.leftoverShort : r.minutes(meal.recipePrepMinutes)} · {r.difficulty[meal.difficulty]}
              {meal.equipment.length > 0 ? ` · ${meal.equipment.map((e) => t.preferences.equipment[e]).join(", ")}` : ""}
            </p>
            {!meal.nutritionComplete ? <Alert tone="warning">{r.incompleteData}</Alert> : null}
            <p className="text-xs text-subtle">{r.calculatedNote}</p>
          </Card>

          <Card>
            <h3 className="mb-3 text-sm font-semibold">{r.instructions}</h3>
            {meal.factor !== 1 || meal.recipeServings !== 1 ? (
              <p className="mb-3 text-xs text-muted">{m.instructionsScaled(r.servings(meal.recipeServings))}</p>
            ) : null}
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
              {meal.instructions.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <h3 className="mb-3 text-sm font-semibold">{m.ingredientsTitle}</h3>
            <ul className="divide-y divide-border text-sm" data-testid="meal-ingredients">
              {meal.ingredients.map((ing, i) => (
                <li key={i} className="flex justify-between gap-3 py-2">
                  <span className="min-w-0">
                    {ing.name}
                    {ing.note ? <span className="text-muted">, {ing.note}</span> : null}
                    {ing.inPantry ? (
                      <Badge tone="success" className="ml-2">
                        {m.inPantry}
                      </Badge>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-right tabular-nums">
                    {formatNumber(ing.amount, undefined, ing.unit === "szt" ? 1 : 0)} {ing.unit}
                    {ing.grams !== null ? <span className="block text-xs text-muted">≈ {formatNumber(ing.grams)} g</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="space-y-1" data-testid="meal-cost">
            <CardTitle>{m.costTitle}</CardTitle>
            <p className="text-lg font-semibold tabular-nums">{mealCostText(meal)}</p>
            <p className="text-xs text-muted">{m.costHint}</p>
            {meal.unpricedCount > 0 ? <p className="text-xs text-danger">{t.pricing.totals.missingCount(meal.unpricedCount)}</p> : null}
          </Card>
          <MealSwap mealId={meal.id} leftover={meal.leftoverOfId !== null} />
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/plan" variant="secondary">
              ← {m.backToWeek}
            </ButtonLink>
            <ButtonLink href={`/przepisy/${meal.recipeId}`} variant="ghost">
              {m.openRecipe}
            </ButtonLink>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MealDetail({ id }: { id: string }) {
  const state = usePlan();
  const m = getMessages().planner.meal;
  if (state.status !== "ready") return <PlanStateNotice state={state} />;
  const meal = state.view.meals.find((x) => x.id === id);
  if (!meal) {
    return (
      <Alert tone="warning" title={m.notFoundTitle} data-testid="meal-not-found">
        <p>{m.notFound}</p>
        <ButtonLink href="/plan" variant="secondary" className="mt-3">
          {m.backToWeek}
        </ButtonLink>
      </Alert>
    );
  }
  return <Detail meal={meal} view={state.view} />;
}
