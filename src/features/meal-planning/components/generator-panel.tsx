"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { describedBy, Field, Input, Select } from "@/components/ui/form";
import type { QuantityUnit } from "@/features/products/types";
import { formatGrosze, formatKcal, getMessages } from "@/i18n";
import { DRAFT_KEYS, readPlannerDrafts, writeDraft } from "@/lib/session-draft";
import { generatePlanAction, plannerOverviewAction, type GeneratePlanState, type PlannerOverview } from "../actions";
import { PANTRY_LIMITS } from "../constants";
import type { ProfileStatus } from "../environment";
import type { PantryRow } from "../pantry";
import { InfeasibleDiagnosis } from "./infeasible-diagnosis";
import { PlanSummary } from "./plan-summary";

export interface PantryProductOption {
  id: string;
  name: string;
  units: QuantityUnit[];
}

const EMPTY_ROW: PantryRow = { productId: "", amount: "", unit: "" };

function readPantryRows(json: string): PantryRow[] {
  if (json === "") return [];
  try {
    const raw: unknown = JSON.parse(json);
    if (!Array.isArray(raw)) return [];
    return raw
      .slice(0, PANTRY_LIMITS.maxItems)
      .map((r) => (r && typeof r === "object" ? (r as Record<string, unknown>) : {}))
      .map((r) => ({
        productId: typeof r.productId === "string" ? r.productId : "",
        amount: typeof r.amount === "string" ? r.amount : "",
        unit: typeof r.unit === "string" ? r.unit : "",
      }));
  } catch {
    return [];
  }
}

function profileText(profile: ProfileStatus): string {
  const t = getMessages();
  const o = t.planner.overview.profile;
  switch (profile.status) {
    case "ok":
      return o.ok(
        formatKcal(profile.targets.kcal),
        Math.round(profile.targets.proteinG),
        Math.round(profile.targets.fatG),
        Math.round(profile.targets.carbohydratesG),
        profile.mealsPerDay,
      );
    case "missing":
      return o.missing;
    case "invalid":
      return o.invalid;
    case "restricted":
      return o.restricted;
    case "goal_blocked":
      return o.goalBlocked;
  }
}

function limitsText(o: PlannerOverview): string {
  const t = getMessages();
  const m = t.planner.overview;
  if (!o.hasDiet) return m.dietDefault;
  const l = o.limits;
  const parts = [
    l.maxPrepMinutes === null ? m.noTimeLimit : m.timeLimit(l.maxPrepMinutes),
    t.preferences.difficulty[l.difficulty],
    l.equipment && l.equipment.length > 0 ? l.equipment.map((e) => t.preferences.equipment[e]).join(", ") : m.noEquipment,
  ];
  if (l.maxIngredients !== null) parts.push(m.maxIngredients(l.maxIngredients));
  parts.push(l.useLeftovers ? m.leftoversOn : m.leftoversOff);
  return parts.join(" · ");
}

function Overview({ o }: { o: PlannerOverview }) {
  const m = getMessages().planner.overview;
  const rows = [
    { key: "profile", label: m.profileLabel, value: profileText(o.profile), href: "/onboarding", warn: o.profile.status !== "ok" },
    { key: "diet", label: m.dietLabel, value: limitsText(o), href: "/ustawienia/zywienie", warn: o.rulesConflict },
    {
      key: "restrictions",
      label: m.restrictionsLabel,
      value: o.hasRestrictions ? m.restrictionsSaved : m.restrictionsNone,
      href: "/ustawienia/alergie",
      warn: false,
    },
    {
      key: "budget",
      label: m.budgetLabel,
      value: o.budgetGrosze === null ? m.budgetNone : m.budget(formatGrosze(o.budgetGrosze), o.allowEstimates),
      href: "/ustawienia/budzet",
      warn: false,
    },
    {
      key: "stores",
      label: m.storesLabel,
      value: (o.stores.length > 0 ? o.stores.join(", ") : m.storesAll) + (o.importFile ? ` · ${m.importFile(o.importFile)}` : ""),
      href: "/ustawienia/sklepy",
      warn: false,
    },
  ];
  return (
    <dl className="divide-y divide-border text-sm" data-testid="planner-overview">
      {rows.map((row) => (
        <div key={row.key} className="grid gap-1 py-2.5 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:gap-3" data-testid={`overview-${row.key}`}>
          <dt className="font-medium">{row.label}</dt>
          <dd className={row.warn ? "min-w-0 text-danger" : "min-w-0 text-muted"}>{row.value}</dd>
          <dd>
            <Link href={row.href} className="font-medium text-primary hover:underline">
              {m.change}
            </Link>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function PantryEditor({
  rows,
  setRows,
  products,
  errors,
}: {
  rows: PantryRow[];
  setRows: (rows: PantryRow[]) => void;
  products: PantryProductOption[];
  errors: { row: number; message: string }[];
}) {
  const m = getMessages().planner.pantry;
  const update = (i: number, patch: Partial<PantryRow>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <fieldset className="space-y-3" data-testid="pantry-editor">
      <legend className="text-sm font-medium">{m.title}</legend>
      <p className="text-xs leading-relaxed text-muted">{m.hint}</p>
      {rows.length === 0 ? <p className="text-sm text-muted">{m.empty}</p> : null}
      <ul className="space-y-2">
        {rows.map((row, i) => {
          const product = products.find((p) => p.id === row.productId);
          const rowErrors = errors.filter((e) => e.row === i + 1);
          return (
            <li key={i} className="rounded-lg border border-border p-3" data-testid={`pantry-row-${i + 1}`}>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_7rem_6rem_auto] sm:items-end">
                <div className="min-w-0">
                  <label htmlFor={`pantry-product-${i}`} className="mb-1 block text-xs text-muted">
                    {m.product}
                  </label>
                  <Select
                    id={`pantry-product-${i}`}
                    name="pantryProduct"
                    value={row.productId}
                    invalid={rowErrors.length > 0}
                    onChange={(e) => {
                      const next = products.find((p) => p.id === e.target.value);
                      update(i, { productId: e.target.value, unit: next?.units[0] ?? "" });
                    }}
                  >
                    <option value="">{m.choose}</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label htmlFor={`pantry-amount-${i}`} className="mb-1 block text-xs text-muted">
                    {m.amount}
                  </label>
                  <Input
                    id={`pantry-amount-${i}`}
                    name="pantryAmount"
                    inputMode="decimal"
                    value={row.amount}
                    onChange={(e) => update(i, { amount: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor={`pantry-unit-${i}`} className="mb-1 block text-xs text-muted">
                    {m.unit}
                  </label>
                  <Select id={`pantry-unit-${i}`} name="pantryUnit" value={row.unit} onChange={(e) => update(i, { unit: e.target.value })}>
                    {(product?.units ?? (row.unit ? [row.unit] : [""])).map((u) => (
                      <option key={u} value={u}>
                        {u || "—"}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button variant="ghost" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label={m.removeLabel(i + 1)}>
                  {m.remove}
                </Button>
              </div>
              {rowErrors.map((e, j) => (
                <p key={j} className="mt-1 text-xs font-medium text-danger">
                  {e.message}
                </p>
              ))}
            </li>
          );
        })}
      </ul>
      {errors.some((e) => e.row === 0) ? (
        <p className="text-xs font-medium text-danger">{errors.find((e) => e.row === 0)!.message}</p>
      ) : null}
      {rows.length < PANTRY_LIMITS.maxItems ? (
        <Button variant="secondary" onClick={() => setRows([...rows, EMPTY_ROW])} data-testid="pantry-add">
          {m.add}
        </Button>
      ) : null}
    </fieldset>
  );
}

export function GeneratorPanel({ products }: { products: PantryProductOption[] }) {
  const t = getMessages();
  const m = t.planner.generator;
  const [state, formAction, pending] = useActionState<GeneratePlanState, FormData>(generatePlanAction, { status: "idle" });
  const [overview, setOverview] = useState<PlannerOverview | null>(null);
  const [overviewError, setOverviewError] = useState(false);
  const [rows, setRows] = useState<PantryRow[]>([]);
  const [startDate, setStartDate] = useState("");

  useEffect(() => {
    const drafts = readPlannerDrafts();
    setRows(readPantryRows(drafts.pantry));
    plannerOverviewAction(drafts)
      .then((o) => {
        setOverview(o);
        setStartDate((current) => current || o.today);
      })
      .catch(() => setOverviewError(true));
  }, []);

  useEffect(() => {
    if (state.status === "idle" || state.status === "invalid") return;
    writeDraft(DRAFT_KEYS.pantry, state.pantryDraft);
    if (state.status === "planned") writeDraft(DRAFT_KEYS.plan, state.planDraft);
  }, [state]);

  const canGenerate = overview !== null && overview.profile.status === "ok" && !overview.rulesConflict;
  const invalid = state.status === "invalid" ? state : null;

  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <div>
          <CardTitle>{m.inputsTitle}</CardTitle>
          <CardDescription>{m.inputsLead}</CardDescription>
        </div>
        {overview ? <Overview o={overview} /> : overviewError ? <Alert tone="danger">{m.overviewError}</Alert> : <p className="text-sm text-muted">{m.loading}</p>}
      </Card>

      {overview && overview.profile.status !== "ok" ? (
        <Alert tone="warning" title={m.needsProfileTitle} data-testid="planner-needs-profile">
          <p>{m.needsProfile}</p>
          <ButtonLink href="/onboarding" variant="secondary" className="mt-3">
            {m.goToProfile}
          </ButtonLink>
        </Alert>
      ) : null}
      {overview?.rulesConflict ? (
        <Alert tone="danger" title={m.rulesConflictTitle} data-testid="planner-rules-conflict">
          <p>{m.rulesConflict}</p>
          <ButtonLink href="/ustawienia/zywienie" variant="secondary" className="mt-3">
            {m.goToDiet}
          </ButtonLink>
        </Alert>
      ) : null}

      {canGenerate ? (
        <Card>
          {/* onSubmit zamiast `action`: React resetowałby formularz po akcji, a wiersze zapasów są kontrolowane. */}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              formData.set("drafts", JSON.stringify(readPlannerDrafts()));
              startTransition(() => formAction(formData));
            }}
            noValidate
            className="space-y-6"
            data-testid="generator-form"
          >
            <div className="max-w-xs">
              <Field id="startDate" label={m.startDate} hint={m.startDateHint} error={invalid?.startDateError ?? undefined}>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  min={overview.today}
                  max={overview.maxStartDate}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  invalid={Boolean(invalid?.startDateError)}
                  aria-describedby={describedBy("startDate", { hint: m.startDateHint, error: invalid?.startDateError ?? undefined })}
                />
              </Field>
            </div>
            <PantryEditor rows={rows} setRows={setRows} products={products} errors={invalid?.pantryErrors ?? []} />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" size="lg" disabled={pending} data-testid="generate-plan">
                {pending ? m.generating : m.generate}
              </Button>
              <p className="text-xs text-muted">{m.deterministic}</p>
            </div>
          </form>
        </Card>
      ) : null}

      <div aria-live="polite" className="space-y-4">
        {invalid ? (
          <Alert tone="danger" data-testid="generator-invalid">
            {invalid.message}
          </Alert>
        ) : null}
        {state.status === "blocked" ? (
          <Alert tone="danger" data-testid="generator-blocked">
            {state.reason === "profile" ? m.needsProfile : m.rulesConflict}
          </Alert>
        ) : null}
        {state.status === "infeasible" ? <InfeasibleDiagnosis reasons={state.reasons} rejected={state.rejected} /> : null}
        {state.status === "planned" ? (
          <div className="space-y-4" data-testid="generator-result">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight">{m.resultTitle}</h2>
              <span className="flex flex-wrap gap-2">
                <ButtonLink href="/zakupy" variant="secondary">
                  {m.openShopping}
                </ButtonLink>
                <ButtonLink href="/plan" data-testid="open-week">
                  {m.openWeek}
                </ButtonLink>
              </span>
            </div>
            <PlanSummary view={state.view} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
