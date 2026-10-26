"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { PlanStateNotice } from "@/features/meal-planning/components/plan-states";
import { usePlan } from "@/features/meal-planning/components/use-plan";
import type { PlanView } from "@/features/meal-planning/view";
import { PriceStatusBadge } from "@/features/pricing/components/price-status-badge";
import type { StatusTotals } from "@/features/pricing/cost";
import type { BaseUnit } from "@/features/products/types";
import { formatGrosze, formatIsoDate, formatNumber, getMessages } from "@/i18n";
import { cn } from "@/lib/cn";
import { DRAFT_KEYS, writeDraft } from "@/lib/session-draft";
import { persistShoppingCheckedAction } from "@/features/auth/persist";
import { checkStateOf, progressOf, pruneChecked, type CheckedMap, type CheckState, type ShoppingGroup, type ShoppingItem } from "../list";

/** Ilość w jednostce bazowej czytelnie: od 1000 g / ml w kg / l. */
export function formatBaseAmount(base: number, unit: BaseUnit): string {
  if (base >= 1000) return `${formatNumber(base / 1000, undefined, 2)} ${unit === "g" ? "kg" : "l"}`;
  return `${formatNumber(base)} ${unit}`;
}

function readChecked(): CheckedMap {
  try {
    const raw: unknown = JSON.parse(window.sessionStorage.getItem(DRAFT_KEYS.shoppingChecked) ?? "{}");
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return Object.fromEntries(Object.entries(raw).filter((e): e is [string, string] => typeof e[1] === "string"));
  } catch {
    return {};
  }
}

function TotalsText({ totals }: { totals: StatusTotals }) {
  const p = getMessages().pricing;
  return (
    <>
      <span className="font-semibold">{formatGrosze(totals.current + totals.stale)}</span>
      {totals.estimated > 0 ? (
        <span className="text-warning">
          {" "}
          + {formatGrosze(totals.estimated)} ({p.status.estimated.toLowerCase()})
        </span>
      ) : null}
    </>
  );
}

function ItemRow({ item, state, onToggle }: { item: ShoppingItem; state: CheckState; onToggle: () => void }) {
  const t = getMessages();
  const m = t.shopping;
  const buy = item.purchase;
  const done = state === "checked";
  return (
    <li data-testid={`shop-${item.productId}`} data-state={state}>
      <label className="flex cursor-pointer items-start gap-3 px-4 py-3.5 transition-colors hover:bg-primary-soft/60">
        <input
          type="checkbox"
          checked={done}
          onChange={onToggle}
          className="mt-0.5 size-6 shrink-0 rounded accent-primary"
          aria-describedby={`shop-${item.productId}-details`}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className={cn("font-medium", done && "text-muted line-through")}>{item.name}</span>
            <span className="shrink-0 text-right text-sm tabular-nums">
              {buy ? <span className="font-semibold">{formatGrosze(buy.packagesCostGrosze)}</span> : <span className="font-medium text-danger">{t.pricing.noPrice}</span>}
            </span>
          </span>
          <span id={`shop-${item.productId}-details`} className="mt-0.5 block text-sm text-muted">
            {buy
              ? m.buy(buy.packages, `${formatNumber(buy.packageAmount, undefined, 3)} ${buy.packageUnit}`, buy.storeName)
              : m.needOnly(formatBaseAmount(item.toBuyBase, item.baseUnit))}
            {item.pieces !== null ? ` · ${m.pieces(item.pieces)}` : ""}
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-muted">
            {m.need(formatBaseAmount(item.needBase, item.baseUnit))}
            {item.pantryBase > 0 ? ` · ${m.fromPantry(formatBaseAmount(item.pantryBase, item.baseUnit))}` : ""}
            {buy && buy.leftoverBase >= 1 ? ` · ${m.leftover(formatBaseAmount(buy.leftoverBase, item.baseUnit))}` : ""}
            <br />
            {m.usedIn(item.mealCount, item.recipes.join(", "))}
          </span>
          <span className="mt-1.5 flex flex-wrap gap-1">
            {buy ? <PriceStatusBadge status={buy.status} /> : null}
            {buy?.promotionEndsOn ? <Badge tone="primary">{t.pricing.promotionUntil(formatIsoDate(buy.promotionEndsOn))}</Badge> : null}
            {item.missingReason ? <Badge tone="warning">{t.pricing.missing[item.missingReason]}</Badge> : null}
            {state === "changed" ? (
              <Badge tone="warning" data-testid={`changed-${item.productId}`}>
                {m.changed}
              </Badge>
            ) : null}
          </span>
        </span>
      </label>
    </li>
  );
}

function GroupCard({
  group,
  title,
  checked,
  hideBought,
  toggle,
}: {
  group: ShoppingGroup;
  title: string;
  checked: CheckedMap;
  hideBought: boolean;
  toggle: (item: ShoppingItem) => void;
}) {
  const items = group.items.filter((i) => !hideBought || checkStateOf(i, checked) !== "checked");
  if (items.length === 0) return null;
  return (
    <Card className="overflow-hidden p-0" data-testid={`group-${group.key ?? "no-price"}`}>
      <div className="flex items-baseline justify-between gap-3 border-b border-border bg-surface-muted px-4 py-2.5">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-right text-sm tabular-nums">
          <TotalsText totals={group.totals} />
        </span>
      </div>
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <ItemRow key={item.productId} item={item} state={checkStateOf(item, checked)} onToggle={() => toggle(item)} />
        ))}
      </ul>
    </Card>
  );
}

function List({ view }: { view: PlanView }) {
  const t = getMessages();
  const m = t.shopping;
  const list = view.shopping;
  const [checked, setChecked] = useState<CheckedMap>({});
  const [mode, setMode] = useState<"category" | "store">("category");
  const [hideBought, setHideBought] = useState(false);

  useEffect(() => {
    const pruned = pruneChecked(list, readChecked());
    writeDraft(DRAFT_KEYS.shoppingChecked, JSON.stringify(pruned));
    setChecked(pruned);
  }, [list]);

  const save = (next: CheckedMap) => {
    writeDraft(DRAFT_KEYS.shoppingChecked, JSON.stringify(next));
    setChecked(next);
    void persistShoppingCheckedAction(next);
  };
  const toggle = (item: ShoppingItem) => {
    const next = { ...checked };
    if (checkStateOf(item, checked) === "checked") delete next[item.productId];
    else next[item.productId] = item.signature;
    save(next);
  };

  const progress = useMemo(() => progressOf(list, checked), [list, checked]);
  const changedCount = list.toBuy.filter((i) => checkStateOf(i, checked) === "changed").length;
  const groups = mode === "category" ? list.byCategory : list.byStore;
  const groupTitle = (g: ShoppingGroup) =>
    mode === "category"
      ? t.catalog.categories[g.key as keyof typeof t.catalog.categories]
      : g.key === null
        ? m.noPriceGroup
        : (view.names.stores[g.key] ?? g.key);

  return (
    <div className="space-y-5" data-testid="shopping-list">
      <Card className="space-y-3 p-4 sm:p-6" data-testid="shopping-progress">
        <div className="flex items-baseline justify-between gap-3">
          <CardTitle>{m.progress(progress.boughtCount, progress.total)}</CardTitle>
          <span className="text-xs text-muted">{m.weekOf(formatIsoDate(view.startDate))}</span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-surface-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.boughtCount}
          aria-label={m.progressLabel}
        >
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress.total ? (progress.boughtCount / progress.total) * 100 : 0}%` }} />
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="min-w-0">
            <dt className="text-xs text-muted">{m.remaining}</dt>
            <dd className="tabular-nums" data-testid="shopping-remaining">
              <TotalsText totals={progress.remaining} />
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-muted">{m.bought}</dt>
            <dd className="tabular-nums" data-testid="shopping-bought">
              <TotalsText totals={progress.bought} />
            </dd>
          </div>
        </dl>
        {list.missingCount > 0 ? (
          <p className="text-xs text-danger" data-testid="shopping-missing">
            {m.missing(list.missingCount)}
          </p>
        ) : null}
      </Card>

      {changedCount > 0 ? (
        <Alert tone="warning" data-testid="shopping-changed">
          {m.changedNotice(changedCount)}
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-border bg-surface p-1" role="group" aria-label={m.groupBy}>
          {(["category", "store"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                "h-9 rounded-full px-4 text-sm font-medium transition-colors",
                mode === value ? "bg-primary text-primary-foreground" : "text-primary hover:bg-primary-soft",
              )}
            >
              {value === "category" ? m.byCategory : m.byStore}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-primary" checked={hideBought} onChange={(e) => setHideBought(e.target.checked)} />
          {m.hideBought}
        </label>
      </div>

      <div className="space-y-4">
        {groups.map((g) => (
          <GroupCard key={g.key ?? "none"} group={g} title={groupTitle(g)} checked={checked} hideBought={hideBought} toggle={toggle} />
        ))}
        {hideBought && progress.boughtCount === progress.total && progress.total > 0 ? (
          <Alert tone="success" data-testid="shopping-done">
            {m.allBought}
          </Alert>
        ) : null}
      </div>

      {list.covered.length > 0 ? (
        <Card className="p-0" data-testid="shopping-pantry">
          <div className="border-b border-border px-4 py-2.5">
            <h3 className="font-semibold">{m.pantryTitle}</h3>
            <p className="text-xs text-muted">{m.pantryLead}</p>
          </div>
          <ul className="divide-y divide-border text-sm">
            {list.covered.map((item) => (
              <li key={item.productId} className="flex justify-between gap-3 px-4 py-3" data-testid={`pantry-${item.productId}`}>
                <span className="min-w-0">
                  <span aria-hidden className="mr-2 text-success">
                    ✓
                  </span>
                  {item.name}
                </span>
                <span className="shrink-0 text-right text-muted tabular-nums">{m.pantryUses(formatBaseAmount(item.needBase, item.baseUnit))}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="space-y-2 p-4 sm:p-6" data-testid="shopping-totals">
        <CardTitle>{m.totalTitle}</CardTitle>
        <p className="text-lg tabular-nums">
          <TotalsText totals={list.totals} />
        </p>
        {list.totals.stale > 0 ? <p className="text-xs text-muted">{m.staleIncluded(formatGrosze(list.totals.stale))}</p> : null}
        <p className="text-xs text-muted">
          {t.planner.summary.pricedOn(formatIsoDate(view.pricedOn))}{" "}
          {view.selectedStores.length > 0 ? t.pricing.recipeCost.stores(view.selectedStores.join(", ")) : t.pricing.recipeCost.allStores}
        </p>
        <p className="text-xs text-subtle">{t.pricing.totals.neverMixed}</p>
        <div className="flex flex-wrap gap-3 pt-2">
          {Object.keys(checked).length > 0 ? (
            <Button variant="secondary" onClick={() => save({})} data-testid="shopping-clear">
              {m.clearChecked}
            </Button>
          ) : null}
          <ButtonLink href="/plan" variant="ghost">
            {m.backToPlan}
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}

export function ShoppingListScreen() {
  const state = usePlan();
  if (state.status !== "ready") return <PlanStateNotice state={state} />;
  return <List view={state.view} />;
}
