import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getMessages } from "@/i18n";
import type { FoodRules, PreferenceConflict } from "../rules";

function conflictText(conflict: PreferenceConflict): string {
  const p = getMessages().preferences;
  switch (conflict.code) {
    case "diet_contradiction": {
      const text = p.conflicts.dietContradiction(
        p.foodGroups[conflict.group],
        p.dietStyles[conflict.requiredBy],
        p.dietStyles[conflict.forbiddenBy],
      );
      const pescatarian = conflict.group === "fish" && conflict.forbiddenBy === "vegetarian";
      return pescatarian ? `${text} ${p.conflicts.pescatarianHint}` : text;
    }
    case "restriction_overrides_diet":
      return p.conflicts.restrictionOverridesDiet(
        p.foodGroups[conflict.group],
        p.dietStyles[conflict.requiredBy],
        p.allergens[conflict.allergen],
        p.exclusionKinds[conflict.kind],
      );
    case "product_preferred_and_disliked":
      return p.conflicts.productPreferredAndDisliked(conflict.product);
    case "preferred_product_excluded":
      return p.conflicts.preferredProductExcluded(conflict.product, p.exclusionKinds[conflict.kind]);
  }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5 px-4 py-3 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="flex flex-wrap gap-1.5 text-sm">{children}</dd>
    </div>
  );
}

export function RulesSummary({ rules, otherDraftNote }: { rules: FoodRules; otherDraftNote?: string }) {
  const p = getMessages().preferences;
  const s = p.summary;
  const blocking = rules.conflicts.filter((c) => c.severity === "blocking");
  const resolved = rules.conflicts.filter((c) => c.severity === "resolved");
  const none = <span className="text-subtle">{s.none}</span>;

  return (
    <Card className="space-y-4" data-testid="rules-summary">
      <h2 className="text-lg font-semibold tracking-tight">{s.title}</h2>
      {otherDraftNote ? <p className="text-xs text-muted">{otherDraftNote}</p> : null}

      {blocking.length > 0 ? (
        <Alert tone="danger" title={s.conflictsBlocking} data-testid="conflicts-blocking">
          <ul className="list-disc space-y-1 pl-4">
            {blocking.map((c, i) => (
              <li key={i}>{conflictText(c)}</li>
            ))}
          </ul>
        </Alert>
      ) : null}
      {resolved.length > 0 ? (
        <Alert tone="warning" title={s.conflictsResolved} data-testid="conflicts-resolved">
          <ul className="list-disc space-y-1 pl-4">
            {resolved.map((c, i) => (
              <li key={i}>{conflictText(c)}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <dl className="divide-y divide-border rounded-lg border border-border">
        <Row label={s.forbidden}>
          {rules.forbiddenGroups.length ? rules.forbiddenGroups.map((g) => <Badge key={g}>{p.foodGroups[g]}</Badge>) : none}
        </Row>
        <Row label={s.required}>
          {rules.requiredGroups.length
            ? rules.requiredGroups.map((g) => (
                <Badge key={g} tone="primary">
                  {p.foodGroups[g]}
                </Badge>
              ))
            : none}
        </Row>
        <Row label={s.allergens}>
          {rules.allergens.length
            ? rules.allergens.map((a) => (
                <Badge key={a.code} tone="warning">
                  {p.allergens[a.code]} · {p.exclusionKinds[a.kind]}
                  {a.excludeTraces ? `, ${s.traces}` : ""}
                </Badge>
              ))
            : none}
        </Row>
        <Row label={s.custom}>
          {rules.customExclusions.length
            ? rules.customExclusions.map((e) => (
                <Badge key={`${e.kind}:${e.label}`}>
                  {e.label} · {p.exclusionKinds[e.kind]}
                </Badge>
              ))
            : none}
        </Row>
        <Row label={s.preferred}>
          {rules.preferredProducts.length
            ? rules.preferredProducts.map((name) => (
                <Badge key={name} tone="success">
                  {name}
                </Badge>
              ))
            : none}
        </Row>
      </dl>
      <p className="text-xs leading-relaxed text-subtle">{s.priority}</p>
      <p className="text-xs leading-relaxed text-subtle">{s.verificationNote}</p>
    </Card>
  );
}
