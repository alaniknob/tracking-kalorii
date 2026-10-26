"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { CostBreakdown } from "@/features/pricing/components/cost-breakdown";
import { formatGrosze, formatKcal, formatNumber, formatPercent, formatWeekdayDate, getMessages } from "@/i18n";
import type { DayView, MealView, PlanView } from "../view";
import { PlanStateNotice } from "./plan-states";
import { PlanSummary } from "./plan-summary";
import { usePlan } from "./use-plan";

export function mealCostText(meal: MealView): string {
  const p = getMessages().pricing;
  const confirmed = meal.cost.current + meal.cost.stale;
  let text = formatGrosze(confirmed);
  if (meal.cost.estimated > 0) text += ` + ${formatGrosze(meal.cost.estimated)} (${p.status.estimated.toLowerCase()})`;
  return text;
}

function MealRow({ meal }: { meal: MealView }) {
  const t = getMessages();
  const m = t.planner;
  return (
    <li>
      <Link
        href={`/plan/posilki/${meal.id}`}
        className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-primary-soft"
        data-testid={`meal-${meal.id}`}
      >
        <span className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-medium tracking-wide text-muted uppercase">{m.slots[meal.slot]}</span>
          <span className="text-xs text-muted tabular-nums">{formatKcal(meal.kcal)}</span>
        </span>
        <span className="mt-0.5 block font-medium">{meal.recipeName}</span>
        <span className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted">
          <span>{m.meal.portion(formatNumber(meal.factor, undefined, 2))}</span>
          <span>·</span>
          <span>{meal.leftoverOfId ? m.meal.leftoverShort : t.recipes.minutes(meal.prepMinutes)}</span>
          <span>·</span>
          <span className="tabular-nums">{mealCostText(meal)}</span>
        </span>
        {meal.leftoverForId || meal.leftoverOfId || meal.preferredHits.length > 0 ? (
          <span className="mt-1.5 flex flex-wrap gap-1">
            {meal.leftoverForId ? <Badge tone="primary">{m.meal.cookDouble}</Badge> : null}
            {meal.leftoverOfId ? <Badge>{m.meal.leftoverBadge}</Badge> : null}
            {meal.preferredHits.length > 0 ? <Badge tone="success">{m.meal.preferred}</Badge> : null}
          </span>
        ) : null}
      </Link>
    </li>
  );
}

function DayCard({ day, view }: { day: DayView; view: PlanView }) {
  const t = getMessages();
  const m = t.planner.week;
  const meals = day.mealIds.map((id) => view.meals.find((meal) => meal.id === id)!);
  return (
    <Card className="min-w-0 p-4" data-testid={`day-${day.index + 1}`}>
      <div className="flex items-baseline justify-between gap-2 px-3">
        <h3 className="font-semibold first-letter:uppercase">{formatWeekdayDate(day.date)}</h3>
        <span className="text-xs text-muted">{m.dayNumber(day.index + 1)}</span>
      </div>
      <p className="mt-1 px-3 text-sm tabular-nums">
        <span className="font-medium">{formatKcal(day.kcal)}</span>{" "}
        <span className={day.withinTolerance ? "text-muted" : "text-warning"}>
          ({day.deviation >= 0 ? "+" : "−"}
          {formatPercent(Math.abs(day.deviation))})
        </span>
      </p>
      <p className="px-3 text-xs text-muted tabular-nums">
        {m.macrosShort(formatNumber(day.proteinG), formatNumber(day.fatG), formatNumber(day.carbohydratesG))}
      </p>
      <ul className="mt-2 divide-y divide-border">
        {meals.map((meal) => (
          <MealRow key={meal.id} meal={meal} />
        ))}
      </ul>
    </Card>
  );
}

export function WeekView() {
  const state = usePlan();
  const t = getMessages();
  const m = t.planner.week;
  if (state.status !== "ready") return <PlanStateNotice state={state} />;
  const { view } = state;

  return (
    <div className="space-y-8" data-testid="week-view">
      <PlanSummary view={view} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">{m.daysTitle}</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {view.days.map((day) => (
            <DayCard key={day.index} day={day} view={view} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card className="min-w-0 space-y-4" data-testid="plan-basket">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>{m.basketTitle}</CardTitle>
              <CardDescription>{m.basketLead}</CardDescription>
            </div>
            <ButtonLink href="/zakupy" data-testid="open-shopping">
              {m.openShopping}
            </ButtonLink>
          </div>
          <CostBreakdown cost={view.basket} names={view.names} />
        </Card>
        <div className="min-w-0 space-y-4">
          <Card data-testid="plan-pantry">
            <CardTitle>{m.pantryTitle}</CardTitle>
            {view.pantryUsed.length === 0 ? (
              <CardDescription>{m.pantryNone}</CardDescription>
            ) : (
              <ul className="mt-2 divide-y divide-border text-sm">
                {view.pantryUsed.map((p) => {
                  const unit = view.names.units[p.productId] ?? "";
                  return (
                    <li key={p.productId} className="flex justify-between gap-3 py-2">
                      <span>{view.names.products[p.productId] ?? p.productId}</span>
                      <span className="text-right text-muted tabular-nums">
                        {m.pantryUsed(`${formatNumber(p.usedBase)} ${unit}`, `${formatNumber(p.availableBase)} ${unit}`)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
          <Card>
            <CardTitle>{m.nextTitle}</CardTitle>
            <CardDescription>{m.nextLead}</CardDescription>
            <ButtonLink href="/generator" variant="secondary" className="mt-3">
              {m.regenerate}
            </ButtonLink>
          </Card>
        </div>
      </section>
    </div>
  );
}
