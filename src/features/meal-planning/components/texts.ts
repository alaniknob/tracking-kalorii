import type { NameMaps } from "@/features/pricing/names";
import { formatPercent, getMessages } from "@/i18n";
import type { InfeasibilityReason, PlanWarning, Remedy } from "../generate";

export function remedyText(remedy: Remedy): string {
  const t = getMessages();
  const r = t.planner.remedies;
  switch (remedy.code) {
    case "raise_prep_time":
      return r.raise_prep_time(remedy.minutes);
    case "allow_medium_difficulty":
      return r.allow_medium_difficulty;
    case "add_equipment":
      return r.add_equipment(remedy.equipment.map((e) => t.preferences.equipment[e]).join(", "));
    case "raise_max_ingredients":
      return r.raise_max_ingredients(remedy.count);
    case "review_diet":
      return r.review_diet;
    case "verify_products":
      return r.verify_products;
    case "more_meals_per_day":
      return r.more_meals_per_day;
    case "fewer_meals_per_day":
      return r.fewer_meals_per_day;
  }
}

/** Gdzie użytkownik może zastosować daną zmianę. */
export function remedyHref(remedy: Remedy): string {
  switch (remedy.code) {
    case "more_meals_per_day":
    case "fewer_meals_per_day":
      return "/onboarding";
    case "verify_products":
      return "/produkty";
    default:
      return "/ustawienia/zywienie";
  }
}

export function reasonTitle(reason: InfeasibilityReason): string {
  const m = getMessages().planner;
  if (reason.code === "no_recipes_for_slot") return m.infeasible.noRecipes(m.slots[reason.slot]);
  return reason.direction === "too_high"
    ? m.infeasible.energyTooHigh(reason.targetKcal, reason.maxKcal)
    : m.infeasible.energyTooLow(reason.targetKcal, reason.minKcal);
}

export function reasonDetails(reason: InfeasibilityReason): string[] {
  if (reason.code !== "no_recipes_for_slot") return [];
  const d = getMessages().planner.infeasible.details;
  const lines = [d.total(reason.total)];
  if (reason.excludedByRules > 0) lines.push(d.excluded(reason.excludedByRules));
  if (reason.needsVerification > 0) lines.push(d.needsVerification(reason.needsVerification));
  for (const [key, count] of Object.entries(reason.practical) as [keyof typeof d.practical, number][]) {
    if (count > 0) lines.push(d.practical[key](count));
  }
  return lines;
}

export function warningText(w: PlanWarning, names: NameMaps, recipeNames: Record<string, string>): string {
  const t = getMessages();
  const m = t.planner.warnings;
  switch (w.code) {
    case "days_off_target":
      return m.days_off_target(w.days.map((d) => d + 1).join(", "));
    case "macro_off":
      return m.macro_off(t.nutrition[w.macro], w.direction, formatPercent(w.averageShare));
    case "required_group_missing":
      return m.required_group_missing(t.preferences.foodGroups[w.group]);
    case "missing_prices":
      return m.missing_prices(w.productIds.map((id) => names.products[id] ?? id).join(", "));
    case "estimated_prices":
      return m.estimated_prices(w.count);
    case "incomplete_nutrition":
      return m.incomplete_nutrition(w.recipeIds.map((id) => recipeNames[id] ?? id).join(", "));
    case "verification_skipped":
      return m.verification_skipped(w.count);
    case "low_variety":
      return m.low_variety(recipeNames[w.recipeId] ?? w.recipeId, w.times);
    case "no_budget":
      return m.no_budget;
  }
}
