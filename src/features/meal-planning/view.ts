import type { BudgetDiagnosis } from "@/features/budget/diagnose";
import type { BasketCost, StatusTotals } from "@/features/pricing/cost";
import { addDays } from "@/features/pricing/dates";
import { proportionalGrosze } from "@/features/pricing/money";
import { namesFor, type NameMaps } from "@/features/pricing/names";
import type { PricingEnvironment } from "@/features/pricing/environment";
import type { Difficulty, KitchenEquipment } from "@/features/preferences/diet-styles";
import { toGrams } from "@/features/products/quantity";
import type { QuantityUnit } from "@/features/products/types";
import type { RecipeReliability } from "@/features/recipes/types";
import { buildShoppingList, type ShoppingList } from "@/features/shopping/list";
import type { RejectedRecipe } from "./candidates";
import type { MealSlot } from "./constants";
import type { GeneratedPlan, PlanTargets, PlanWarning } from "./generate";
import type { PantryItem } from "./pantry";

export interface IngredientView {
  productId: string;
  name: string;
  amount: number;
  unit: QuantityUnit;
  /** Masa w gramach, gdy ilość podano w innej jednostce. */
  grams: number | null;
  note: string | null;
  inPantry: boolean;
}

export interface MealView {
  /** Stabilny w obrębie planu: „dzień-posiłek”, np. „1-3”. */
  id: string;
  day: number;
  date: string;
  slot: MealSlot;
  recipeId: string;
  recipeName: string;
  recipeIsDemo: boolean;
  reliability: RecipeReliability;
  recipeServings: number;
  factor: number;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbohydratesG: number;
  nutritionComplete: boolean;
  /** 0 dla resztek (gotowane wcześniej). */
  prepMinutes: number;
  recipePrepMinutes: number;
  difficulty: Exclude<Difficulty, "any">;
  equipment: KitchenEquipment[];
  leftoverOfId: string | null;
  leftoverForId: string | null;
  ingredients: IngredientView[];
  instructions: string[];
  /** Koszt zużytej części składników (wg ofert z koszyka), osobno dla każdego statusu ceny. */
  cost: StatusTotals;
  unpricedCount: number;
  preferredHits: string[];
}

export interface DayView {
  index: number;
  date: string;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbohydratesG: number;
  withinTolerance: boolean;
  /** Odchylenie od celu kcal (ułamek, ze znakiem). */
  deviation: number;
  mealIds: string[];
}

export interface PlanView {
  startDate: string;
  /** Data wyceny (ceny i promocje według stanu na ten dzień). */
  pricedOn: string;
  status: GeneratedPlan["status"];
  targets: PlanTargets;
  days: DayView[];
  meals: MealView[];
  warnings: PlanWarning[];
  budget: BudgetDiagnosis | null;
  /** Koszt wszystkich składników planu (bez odliczania zapasów). */
  full: Pick<BasketCost, "used" | "packages" | "missingCount">;
  /** Do kupienia: potrzeby minus zapasy, w całych opakowaniach. */
  basket: BasketCost;
  pantryUsed: GeneratedPlan["pantryUsed"];
  /** Lista zakupów liczona z tego planu (każda zmiana planu = nowa lista). */
  shopping: ShoppingList;
  names: NameMaps;
  recipeNames: Record<string, string>;
  /** Puste = nie wybrano sklepów (wycena ze wszystkich sieci z listy). */
  selectedStores: string[];
  importFile: string | null;
  totalPrepMinutes: number;
  leftoverMeals: number;
}

export const mealId = (day: number, slotIndex: number) => `${day + 1}-${slotIndex + 1}`;

const round1 = (v: number) => Math.round(v * 10) / 10;

export function buildPlanView(
  plan: GeneratedPlan,
  pricing: PricingEnvironment,
  pantry: readonly PantryItem[],
  startDate: string,
): PlanView {
  const perDay = plan.slots.length;
  const ids = plan.meals.map((_, i) => mealId(Math.floor(i / perDay), i % perDay));
  const offers = new Map(plan.full.items.map((item) => [item.productId, item] as const));
  // Oferta wybrana dla koszyka ma pierwszeństwo — to ją użytkownik kupi.
  for (const item of plan.basket.items) offers.set(item.productId, item);
  const inPantry = new Set(pantry.map((p) => p.productId));
  const products = pricing.ctx.products;

  const meals: MealView[] = plan.meals.map((meal, i) => {
    const cost: StatusTotals = { current: 0, stale: 0, estimated: 0 };
    let unpricedCount = 0;
    for (const need of meal.needs) {
      const item = offers.get(need.productId);
      if (!item || !item.priced) {
        unpricedCount++;
        continue;
      }
      const offer = item.choice.offer;
      cost[offer.status] += proportionalGrosze(offer.priceGrosze, need.baseAmount, offer.packageBase);
    }
    const scale = meal.factor / meal.recipe.servings;
    const ingredients = meal.recipe.ingredients.map((ing): IngredientView => {
      const product = products.get(ing.productId);
      const amount = ing.amount * scale;
      const grams = product && ing.unit !== "g" ? toGrams(amount, ing.unit, product) : null;
      return {
        productId: ing.productId,
        name: product?.name ?? ing.productId,
        amount,
        unit: ing.unit,
        grams: grams?.ok ? Math.round(grams.value) : null,
        note: ing.note,
        inPantry: inPantry.has(ing.productId),
      };
    });
    return {
      id: ids[i],
      day: meal.day,
      date: addDays(startDate, meal.day),
      slot: meal.slot,
      recipeId: meal.recipe.id,
      recipeName: meal.recipe.name,
      recipeIsDemo: meal.recipe.source.isDemo,
      reliability: meal.recipe.reliability,
      recipeServings: meal.recipe.servings,
      factor: meal.factor,
      kcal: meal.kcal,
      proteinG: meal.proteinG,
      fatG: meal.fatG,
      carbohydratesG: meal.carbohydratesG,
      nutritionComplete: meal.nutritionComplete,
      prepMinutes: meal.prepMinutes,
      recipePrepMinutes: meal.recipe.prepMinutes,
      difficulty: meal.recipe.difficulty,
      equipment: meal.recipe.equipment,
      leftoverOfId: meal.leftoverOf === null ? null : ids[meal.leftoverOf],
      leftoverForId: meal.leftoverFor === null ? null : ids[meal.leftoverFor],
      ingredients,
      instructions: meal.recipe.instructions,
      cost,
      unpricedCount,
      preferredHits: meal.preferredHits,
    };
  });

  const days: DayView[] = plan.days.map((d, index) => ({
    index,
    date: addDays(startDate, index),
    kcal: Math.round(d.kcal),
    proteinG: round1(d.proteinG),
    fatG: round1(d.fatG),
    carbohydratesG: round1(d.carbohydratesG),
    withinTolerance: d.withinTolerance,
    deviation: plan.targets.kcal > 0 ? (d.kcal - plan.targets.kcal) / plan.targets.kcal : 0,
    mealIds: ids.slice(index * perDay, (index + 1) * perDay),
  }));

  const names = namesFor(pricing);
  return {
    startDate,
    pricedOn: pricing.today,
    status: plan.status,
    targets: plan.targets,
    days,
    meals,
    warnings: plan.warnings,
    budget: plan.budget,
    full: { used: plan.full.used, packages: plan.full.packages, missingCount: plan.full.missingCount },
    basket: plan.basket,
    pantryUsed: plan.pantryUsed,
    shopping: buildShoppingList({
      full: plan.full,
      basket: plan.basket,
      pantryUsed: plan.pantryUsed,
      meals: plan.meals.map((m) => ({ recipeName: m.recipe.name, needs: m.needs })),
      products,
      storeNames: names.stores,
    }),
    names,
    recipeNames: Object.fromEntries(plan.meals.map((m) => [m.recipe.id, m.recipe.name])),
    selectedStores: pricing.stores ? pricing.selectedStores.map((s) => s.name) : [],
    importFile: pricing.importInfo?.fileName ?? null,
    totalPrepMinutes: meals.reduce((sum, m) => sum + m.prepMinutes, 0),
    leftoverMeals: meals.filter((m) => m.leftoverOfId !== null).length,
  };
}

/** Podsumowanie odrzuconych przepisów (do wyjaśnienia, czemu plan wygląda tak, a nie inaczej). */
export interface RejectedSummary {
  excluded: number;
  needsVerification: number;
  /** Zgodne z regułami, ale odrzucone przez ograniczenia praktyczne (czas, trudność, sprzęt, składniki). */
  practical: number;
}

export function rejectedSummary(rejected: readonly RejectedRecipe[]): RejectedSummary {
  return {
    excluded: rejected.filter((r) => r.fit.status === "excluded").length,
    needsVerification: rejected.filter((r) => r.fit.status === "needs_verification").length,
    practical: rejected.filter((r) => r.fit.status === "no_conflict_found").length,
  };
}
