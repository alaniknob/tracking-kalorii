"use server";

import { costNeeds, type BasketCost, type Need } from "@/features/pricing/cost";
import { loadPricingEnvironment, sanitizeDrafts } from "@/features/pricing/environment";
import { namesFor, type NameMaps } from "@/features/pricing/names";
import { resolveRulesFromDrafts } from "@/features/preferences/evaluate";
import { catalog } from "@/features/recipes/catalog";
import { recipeNeeds } from "@/features/recipes/cost";
import { evaluateProductFit, evaluateRecipeFit } from "@/features/recipes/fit";
import { getMessages } from "@/i18n";
import { fieldErrorsOf } from "@/lib/draft";
import { diagnoseBudget, findCheaperAlternatives, type BudgetDiagnosis } from "./diagnose";
import { budgetSettingsSchema, MAX_TIMES_PER_WEEK, readBudgetFormData, type BudgetField, type BudgetFormValues, type BudgetSettings } from "./schema";

export type BudgetFormState =
  | { status: "idle"; values: BudgetFormValues }
  | { status: "invalid"; values: BudgetFormValues; message: string; fieldErrors: Partial<Record<BudgetField, string>> }
  | { status: "success"; values: BudgetFormValues; settings: BudgetSettings };

export async function saveBudgetAction(_prev: BudgetFormState, formData: FormData): Promise<BudgetFormState> {
  const values = readBudgetFormData(formData);
  const parsed = budgetSettingsSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "invalid",
      values,
      message: getMessages().validation.formInvalid,
      fieldErrors: fieldErrorsOf<BudgetField>(parsed.error),
    };
  }
  return { status: "success", values, settings: parsed.data };
}

export type BasketCheckState =
  | { status: "idle" }
  | { status: "no_budget" }
  | { status: "invalid"; message: string }
  | {
      status: "done";
      diagnosis: BudgetDiagnosis;
      cost: BasketCost;
      names: NameMaps;
      selection: { recipeId: string; name: string; times: number }[];
      /** Wybrane przepisy wykluczone przez alergie/dietę — budżet nie zmienia tej oceny. */
      excludedRecipes: string[];
      unconvertible: string[];
      allowEstimates: boolean;
      hasRules: boolean;
    };

const str = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
};

/**
 * Sprawdzenie budżetu na koszyku z wybranych przepisów (ręczny „mini-plan” do czasu generatora).
 * Produkty powtarzające się w przepisach są sumowane i kupowane w całych opakowaniach.
 */
export async function checkBasketAction(_prev: BasketCheckState, formData: FormData): Promise<BasketCheckState> {
  const v = getMessages().validation;
  const env = await loadPricingEnvironment(
    sanitizeDrafts({ stores: str(formData, "storesDraft"), budget: str(formData, "budgetDraft"), priceImport: str(formData, "priceImportDraft") }),
  );
  if (!env.budget) return { status: "no_budget" };

  const recipes = await catalog.listRecipes();
  const selection: { recipeId: string; name: string; times: number }[] = [];
  for (const recipe of recipes) {
    const raw = str(formData, `times:${recipe.id}`).trim();
    if (raw === "" || raw === "0") continue;
    const times = Number(raw);
    if (!Number.isInteger(times) || times < 0 || times > MAX_TIMES_PER_WEEK) {
      return { status: "invalid", message: v.basketTimes(recipe.name, MAX_TIMES_PER_WEEK) };
    }
    selection.push({ recipeId: recipe.id, name: recipe.name, times });
  }
  if (selection.length === 0) return { status: "invalid", message: v.basketEmpty };

  const { hasSettings, rules } = resolveRulesFromDrafts(str(formData, "dietDraft"), str(formData, "restrictionsDraft"));
  const needs: Need[] = [];
  const unconvertible = new Set<string>();
  const excludedRecipes: string[] = [];
  for (const item of selection) {
    const recipe = recipes.find((r) => r.id === item.recipeId)!;
    const result = recipeNeeds(recipe, env.ctx.products, item.times);
    needs.push(...result.needs);
    result.unconvertible.forEach((id) => unconvertible.add(id));
    if (evaluateRecipeFit(recipe, env.ctx.products, rules).status === "excluded") excludedRecipes.push(recipe.id);
  }

  const cost = costNeeds(needs, env.ctx);
  const alternatives = findCheaperAlternatives(
    cost.items,
    env.ctx,
    env.products,
    (product) => evaluateProductFit(product, rules).status === "no_conflict_found",
  );

  return {
    status: "done",
    diagnosis: diagnoseBudget(cost, env.budget, alternatives),
    cost,
    names: namesFor(env),
    selection,
    excludedRecipes,
    unconvertible: [...unconvertible],
    allowEstimates: env.budget.allowEstimates,
    hasRules: hasSettings,
  };
}
