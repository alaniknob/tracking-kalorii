import { CHEAPER_ALTERNATIVE_MIN_SAVING } from "@/features/pricing/constants";
import { bestChoice, confirmedTotal, type BasketCost, type ItemCost, type PricingContext } from "@/features/pricing/cost";
import { productOffers } from "@/features/pricing/offers";
import type { Grosze } from "@/features/pricing/types";
import type { Product } from "@/features/products/types";
import type { BudgetSettings } from "./schema";

/**
 * - `within` — mieści się, wszystkie ceny potwierdzone,
 * - `within_with_estimates` — mieści się, ale część cen jest szacunkowa,
 * - `incomplete` — znane ceny się mieszczą, ale części produktów nie da się wycenić,
 * - `over` — przekroczony już na podstawie znanych cen (braki tylko zwiększą kwotę).
 */
export type BudgetStatus = "within" | "within_with_estimates" | "incomplete" | "over";

export type BudgetSuggestion =
  | { code: "switch_store"; productId: string; storeId: string; savingGrosze: Grosze }
  | {
      code: "cheaper_alternative";
      productId: string;
      alternativeId: string;
      storeId: string;
      unitPriceGrosze: Grosze;
      alternativeUnitPriceGrosze: Grosze;
    }
  | { code: "reduce_leftovers"; leftoverValueGrosze: Grosze }
  | { code: "missing_prices"; count: number }
  | { code: "allow_estimates"; count: number }
  | { code: "change_recipes" };

export interface BudgetDiagnosis {
  status: BudgetStatus;
  budgetGrosze: Grosze;
  /** Koszt opakowań wg cen potwierdzonych (aktualnych i nieaktualnych). */
  confirmedGrosze: Grosze;
  /** Koszt opakowań wg cen szacunkowych — zawsze podawany osobno. */
  estimatedGrosze: Grosze;
  /** Potrzebny budżet = koszt opakowań; przy brakach cen to dolna granica. */
  requiredGrosze: Grosze;
  requiredIsLowerBound: boolean;
  shortfallGrosze: Grosze;
  /** Wartość niezużytej części kupionych opakowań. */
  leftoverValueGrosze: Grosze;
  /** Pozycje, które najbardziej obciążają koszyk (malejąco). */
  topCosts: { productId: string; packagesCostGrosze: Grosze }[];
  suggestions: BudgetSuggestion[];
}

/** Udział wartości resztek w koszcie opakowań, powyżej którego proponujemy lepsze wykorzystanie. */
const LEFTOVER_SUGGESTION_SHARE = 0.15;

type Priced = Extract<ItemCost, { priced: true }>;

/**
 * Tańszy produkt z tej samej kategorii i z tą samą jednostką bazową, dozwolony przez reguły
 * użytkownika (`isAllowed` — alergie i dieta są twardym ograniczeniem, nigdy nie są luzowane
 * dla ceny). Zmienia wartości odżywcze, więc jest tylko propozycją do rozważenia.
 */
export function findCheaperAlternatives(
  items: readonly ItemCost[],
  ctx: PricingContext,
  candidates: readonly Product[],
  isAllowed: (product: Product) => boolean,
): Extract<BudgetSuggestion, { code: "cheaper_alternative" }>[] {
  const result: Extract<BudgetSuggestion, { code: "cheaper_alternative" }>[] = [];
  const inBasket = new Set(items.map((i) => i.productId));
  for (const item of items) {
    if (!item.priced) continue;
    const product = ctx.products.get(item.productId);
    if (!product) continue;
    const current = item.choice.offer;
    let best: { product: Product; storeId: string; unitPriceGrosze: Grosze } | null = null;
    for (const alt of candidates) {
      if (alt.id === product.id || inBasket.has(alt.id) || alt.category !== product.category || alt.baseUnit !== product.baseUnit) {
        continue;
      }
      if (!isAllowed(alt)) continue;
      const offers = productOffers(alt, ctx.prices, ctx.promotions, ctx.today, ctx.storeIds).offers.filter(
        (o) => (ctx.allowEstimates || o.status !== "estimated") && (current.status === "estimated" || o.status !== "estimated"),
      );
      const choice = bestChoice(offers, item.needBase);
      if (!choice) continue;
      if (choice.offer.unitPriceGrosze > current.unitPriceGrosze * (1 - CHEAPER_ALTERNATIVE_MIN_SAVING)) continue;
      if (!best || choice.offer.unitPriceGrosze < best.unitPriceGrosze) {
        best = { product: alt, storeId: choice.offer.storeId, unitPriceGrosze: choice.offer.unitPriceGrosze };
      }
    }
    if (best) {
      result.push({
        code: "cheaper_alternative",
        productId: product.id,
        alternativeId: best.product.id,
        storeId: best.storeId,
        unitPriceGrosze: current.unitPriceGrosze,
        alternativeUnitPriceGrosze: best.unitPriceGrosze,
      });
    }
  }
  return result;
}

/**
 * Porównanie kosztu koszyka z budżetem. Budżet jest twardym ograniczeniem — diagnoza nigdy
 * nie proponuje obejścia alergii ani diety. Ceny szacunkowe są liczone tylko, gdy użytkownik
 * na to pozwolił, i zawsze podawane osobno.
 */
export function diagnoseBudget(
  cost: BasketCost,
  budget: BudgetSettings,
  alternatives: readonly Extract<BudgetSuggestion, { code: "cheaper_alternative" }>[] = [],
): BudgetDiagnosis {
  const confirmedGrosze = confirmedTotal(cost.packages);
  const estimatedGrosze = cost.packages.estimated;
  const requiredGrosze = confirmedGrosze + estimatedGrosze;
  const usedGrosze = confirmedTotal(cost.used) + cost.used.estimated;
  const leftoverValueGrosze = requiredGrosze - usedGrosze;
  const priced = cost.items.filter((i): i is Priced => i.priced);

  let status: BudgetStatus;
  if (requiredGrosze > budget.weeklyBudgetGrosze) status = "over";
  else if (cost.missingCount > 0) status = "incomplete";
  else if (estimatedGrosze > 0) status = "within_with_estimates";
  else status = "within";

  const suggestions: BudgetSuggestion[] = [];
  const onlyEstimates = cost.items.filter((i) => !i.priced && i.reason === "only_estimates").length;
  const noPrice = cost.missingCount - onlyEstimates;
  if (noPrice > 0) suggestions.push({ code: "missing_prices", count: noPrice });
  if (onlyEstimates > 0) suggestions.push({ code: "allow_estimates", count: onlyEstimates });

  if (status === "over") {
    for (const item of priced) {
      if (item.cheaperElsewhere) {
        suggestions.push({
          code: "switch_store",
          productId: item.productId,
          storeId: item.cheaperElsewhere.offer.storeId,
          savingGrosze: item.cheaperElsewhere.savingGrosze,
        });
      }
    }
    suggestions.push(...alternatives);
    if (requiredGrosze > 0 && leftoverValueGrosze / requiredGrosze >= LEFTOVER_SUGGESTION_SHARE) {
      suggestions.push({ code: "reduce_leftovers", leftoverValueGrosze });
    }
    suggestions.push({ code: "change_recipes" });
  }

  return {
    status,
    budgetGrosze: budget.weeklyBudgetGrosze,
    confirmedGrosze,
    estimatedGrosze,
    requiredGrosze,
    requiredIsLowerBound: cost.missingCount > 0,
    shortfallGrosze: Math.max(0, requiredGrosze - budget.weeklyBudgetGrosze),
    leftoverValueGrosze,
    topCosts: [...priced]
      .sort((a, b) => b.choice.packagesCostGrosze - a.choice.packagesCostGrosze)
      .slice(0, 3)
      .map((i) => ({ productId: i.productId, packagesCostGrosze: i.choice.packagesCostGrosze })),
    suggestions,
  };
}
