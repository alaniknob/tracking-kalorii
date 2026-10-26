import type { SupabaseClient } from "@supabase/supabase-js";
import { EU_ALLERGENS } from "@/features/allergens";
import { budgetDraftSchema, budgetSettingsSchema } from "@/features/budget/schema";
import { GENERATOR_VERSION, type MealPick } from "@/features/meal-planning/generate";
import type { PlanView } from "@/features/meal-planning/view";
import { parsePantryDraft } from "@/features/meal-planning/pantry";
import { dietDraftSchema, dietSettingsSchema, restrictionsDraftSchema, restrictionsSchema } from "@/features/preferences/schema";
import { importPricesCsv } from "@/features/pricing/import";
import { priceImportDraftSchema } from "@/features/pricing/environment";
import { todayInPoland } from "@/features/pricing/dates";
import { catalog } from "@/features/recipes/catalog";
import { createProfileSchema, profileDraftSchema } from "@/features/profile/schema";
import { knownStores, storesDraftSchema, storesSettingsSchema } from "@/features/stores/schema";
import { DRAFT_KEYS } from "@/lib/draft-keys";
import { parseDraft } from "@/lib/draft";

export function groszeToPln(grosze: number): number {
  return Math.round(grosze) / 100;
}

async function productUuid(supabase: SupabaseClient, slug: string): Promise<string | null> {
  const { data } = await supabase.from("products").select("id").eq("slug", slug).maybeSingle();
  return data?.id ?? null;
}

async function recipeUuid(supabase: SupabaseClient, slug: string): Promise<string | null> {
  const { data } = await supabase.from("recipes").select("id").eq("slug", slug).maybeSingle();
  return data?.id ?? null;
}

export async function saveNormalizedSettings(
  supabase: SupabaseClient,
  userId: string,
  key: string,
  value: string,
): Promise<void> {
  if (value === "") {
    if (key === DRAFT_KEYS.profile) {
      await supabase.from("profile_health_flags").delete().eq("user_id", userId);
      await supabase.from("profiles").delete().eq("user_id", userId);
    }
    if (key === DRAFT_KEYS.diet) {
      await supabase.from("user_preferred_products").delete().eq("user_id", userId);
      await supabase.from("user_preferences").delete().eq("user_id", userId);
      await supabase.from("user_exclusions").delete().eq("user_id", userId).eq("kind", "dislike");
    }
    if (key === DRAFT_KEYS.restrictions) {
      await supabase.from("user_exclusions").delete().eq("user_id", userId).neq("kind", "dislike");
    }
    if (key === DRAFT_KEYS.stores) {
      await supabase.from("user_stores").delete().eq("user_id", userId);
      await supabase.from("user_custom_stores").delete().eq("user_id", userId);
    }
    if (key === DRAFT_KEYS.pantry) await supabase.from("pantry_items").delete().eq("user_id", userId);
    if (key === DRAFT_KEYS.priceImport) {
      await supabase.from("user_store_prices").delete().eq("user_id", userId);
      await supabase.from("user_promotions").delete().eq("user_id", userId);
      await supabase.from("user_price_imports").delete().eq("user_id", userId);
    }
    if (key === DRAFT_KEYS.budget) {
      await supabase.from("profiles").update({ weekly_budget_pln: null, allow_estimates: true }).eq("user_id", userId);
    }
    return;
  }

  if (key === DRAFT_KEYS.profile) await saveProfile(supabase, userId, value);
  if (key === DRAFT_KEYS.diet) await saveDiet(supabase, userId, value);
  if (key === DRAFT_KEYS.restrictions) await saveRestrictions(supabase, userId, value);
  if (key === DRAFT_KEYS.stores) await saveStores(supabase, userId, value);
  if (key === DRAFT_KEYS.budget) await saveBudget(supabase, userId, value);
  if (key === DRAFT_KEYS.pantry) await savePantry(supabase, userId, value);
  if (key === DRAFT_KEYS.priceImport) await savePriceImport(supabase, userId, value);
}

async function saveProfile(supabase: SupabaseClient, userId: string, json: string) {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return;
  }
  const draft = profileDraftSchema.safeParse(raw);
  if (!draft.success) return;
  const parsed = createProfileSchema().safeParse(draft.data);
  if (!parsed.success) return;
  const p = parsed.data;
  await supabase.from("profiles").upsert({
    user_id: userId,
    birth_date: p.birthDate,
    height_cm: p.heightCm,
    weight_kg: p.weightKg,
    target_weight_kg: p.targetWeightKg ?? null,
    sex: p.sex,
    activity_level: p.activityLevel,
    goal: p.goal,
    meals_per_day: p.mealsPerDay,
  });
  await supabase.from("profile_health_flags").delete().eq("user_id", userId);
  if (p.healthFlags.length > 0) {
    await supabase.from("profile_health_flags").insert(p.healthFlags.map((flag) => ({ user_id: userId, flag })));
  }
}

async function saveDiet(supabase: SupabaseClient, userId: string, json: string) {
  const settings = parseDraft(json, dietDraftSchema, dietSettingsSchema);
  if (!settings) return;
  await supabase.from("user_preferences").upsert({
    user_id: userId,
    diet_styles: [...settings.dietStyles],
    max_ingredients: settings.maxIngredients,
    max_prep_minutes: settings.maxPrepMinutes,
    difficulty: settings.difficulty,
    use_leftovers: settings.useLeftovers,
    kitchen_equipment: [...settings.equipment],
  });
  await supabase.from("user_preferred_products").delete().eq("user_id", userId);
  if (settings.preferredProducts.length > 0) {
    await supabase
      .from("user_preferred_products")
      .insert(settings.preferredProducts.map((label) => ({ user_id: userId, custom_label: label })));
  }
  await supabase.from("user_exclusions").delete().eq("user_id", userId).eq("kind", "dislike");
  if (settings.dislikedProducts.length > 0) {
    await supabase
      .from("user_exclusions")
      .insert(settings.dislikedProducts.map((label) => ({ user_id: userId, kind: "dislike", custom_label: label })));
  }
}

async function saveRestrictions(supabase: SupabaseClient, userId: string, json: string) {
  const settings = parseDraft(json, restrictionsDraftSchema, restrictionsSchema);
  if (!settings) return;
  await supabase.from("user_exclusions").delete().eq("user_id", userId).neq("kind", "dislike");
  const rows: Record<string, unknown>[] = [];
  for (const item of settings.allergens) {
    if (!EU_ALLERGENS.includes(item.code)) continue;
    rows.push({
      user_id: userId,
      kind: item.kind,
      allergen_code: item.code,
      exclude_traces: item.excludeTraces,
    });
  }
  for (const label of settings.otherAllergies) rows.push({ user_id: userId, kind: "allergy", custom_label: label, exclude_traces: true });
  for (const label of settings.otherIntolerances) rows.push({ user_id: userId, kind: "intolerance", custom_label: label });
  for (const label of settings.voluntaryExclusions) rows.push({ user_id: userId, kind: "voluntary", custom_label: label });
  if (rows.length > 0) await supabase.from("user_exclusions").insert(rows);
}

async function saveStores(supabase: SupabaseClient, userId: string, json: string) {
  const settings = parseDraft(json, storesDraftSchema, storesSettingsSchema);
  if (!settings) return;
  await supabase.from("user_stores").delete().eq("user_id", userId);
  await supabase.from("user_custom_stores").delete().eq("user_id", userId);
  if (settings.chains.length > 0) {
    await supabase.from("user_stores").insert(settings.chains.map((store_id) => ({ user_id: userId, store_id })));
  }
  const custom = knownStores(settings).filter((store) => store.kind === "custom");
  if (custom.length > 0) {
    await supabase.from("user_custom_stores").insert(custom.map((store) => ({ user_id: userId, store_id: store.id, name: store.name })));
  }
}

async function saveBudget(supabase: SupabaseClient, userId: string, json: string) {
  const settings = parseDraft(json, budgetDraftSchema, budgetSettingsSchema);
  if (!settings) return;
  const { data: profile } = await supabase.from("profiles").select("user_id").eq("user_id", userId).maybeSingle();
  if (!profile) return;
  await supabase
    .from("profiles")
    .update({ weekly_budget_pln: groszeToPln(settings.weeklyBudgetGrosze), allow_estimates: settings.allowEstimates })
    .eq("user_id", userId);
}

async function savePantry(supabase: SupabaseClient, userId: string, json: string) {
  const products = new Map((await catalog.listProducts()).map((p) => [p.id, p]));
  const items = parsePantryDraft(json, products);
  await supabase.from("pantry_items").delete().eq("user_id", userId);
  for (const item of items) {
    const productId = await productUuid(supabase, item.productId);
    if (!productId) continue;
    await supabase.from("pantry_items").insert({
      user_id: userId,
      product_id: productId,
      amount: item.amount,
      unit: item.unit,
    });
  }
}

async function savePriceImport(supabase: SupabaseClient, userId: string, json: string) {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return;
  }
  const draft = priceImportDraftSchema.safeParse(raw);
  if (!draft.success) return;
  await supabase.from("user_price_imports").upsert({
    user_id: userId,
    file_name: draft.data.fileName,
    csv_text: draft.data.csv,
    imported_at: new Date().toISOString(),
  });
  const products = await catalog.listProducts();
  const stores = knownStores(null);
  const result = importPricesCsv(draft.data.csv, { products, stores, today: todayInPoland() });
  await supabase.from("user_store_prices").delete().eq("user_id", userId);
  await supabase.from("user_promotions").delete().eq("user_id", userId);
  if (result.status !== "done") return;
  for (const price of result.prices) {
    const productId = await productUuid(supabase, price.productId);
    if (!productId) continue;
    await supabase.from("user_store_prices").insert({
      user_id: userId,
      product_id: productId,
      store_id: price.storeId,
      price: groszeToPln(price.priceGrosze),
      package_amount: price.packageAmount,
      package_unit: price.packageUnit,
      observed_on: price.observedOn,
      is_estimate: price.isEstimate,
      source_name: price.source.name,
    });
  }
  for (const promo of result.promotions) {
    const productId = await productUuid(supabase, promo.productId);
    if (!productId) continue;
    await supabase.from("user_promotions").insert({
      user_id: userId,
      product_id: productId,
      store_id: promo.storeId,
      promo_price: groszeToPln(promo.promoPriceGrosze),
      package_amount: promo.packageAmount,
      package_unit: promo.packageUnit,
      starts_on: promo.startsOn,
      ends_on: promo.endsOn,
      conditions: promo.conditions,
      source_name: promo.source.name,
    });
  }
}

export async function savePlanRows(
  supabase: SupabaseClient,
  userId: string,
  params: { view: PlanView; fingerprint: string; assignment: MealPick[] },
): Promise<string | null> {
  const { view, fingerprint, assignment } = params;
  const used = view.full.used;
  const packages = view.full.packages;
  const basket = view.basket;
  const { data: plan, error } = await supabase
    .from("meal_plans")
    .insert({
      user_id: userId,
      start_date: view.startDate,
      priced_on: view.pricedOn,
      target_kcal: view.targets.kcal,
      target_protein_g: view.targets.proteinG,
      target_fat_g: view.targets.fatG,
      target_carbohydrates_g: view.targets.carbohydratesG,
      meals_per_day: view.days[0]?.mealIds.length ?? assignment.length / 7,
      budget_pln: view.budget ? groszeToPln(view.budget.budgetGrosze) : null,
      status: view.status,
      generator_version: GENERATOR_VERSION,
      settings_fingerprint: fingerprint,
      warnings: view.warnings,
      used_current_pln: groszeToPln(used.current),
      used_stale_pln: groszeToPln(used.stale),
      used_estimated_pln: groszeToPln(used.estimated),
      packages_current_pln: groszeToPln(packages.current),
      packages_stale_pln: groszeToPln(packages.stale),
      packages_estimated_pln: groszeToPln(packages.estimated),
      basket_current_pln: groszeToPln(basket.packages.current),
      basket_stale_pln: groszeToPln(basket.packages.stale),
      basket_estimated_pln: groszeToPln(basket.packages.estimated),
      assignment,
    })
    .select("id")
    .single();
  if (error || !plan) return null;
  const planId = plan.id as string;

  const items = [];
  for (let i = 0; i < view.meals.length; i++) {
    const meal = view.meals[i];
    items.push({
      meal_plan_id: planId,
      position: i,
      day: meal.day,
      slot: meal.slot,
      recipe_slug: meal.recipeId,
      recipe_id: await recipeUuid(supabase, meal.recipeId),
      portion_factor: meal.factor,
      leftover_of_position: meal.leftoverOfId ? view.meals.findIndex((m) => m.id === meal.leftoverOfId) : null,
      kcal: meal.kcal,
      protein_g: meal.proteinG,
      fat_g: meal.fatG,
      carbohydrates_g: meal.carbohydratesG,
    });
  }
  if (items.length > 0) await supabase.from("meal_plan_items").insert(items);

  const { data: list } = await supabase.from("shopping_lists").insert({ user_id: userId, meal_plan_id: planId }).select("id").single();
  if (list) {
    const shopItems = [];
    for (const item of [...view.shopping.toBuy, ...view.shopping.covered]) {
      shopItems.push({
        shopping_list_id: list.id,
        product_slug: item.productId,
        product_id: await productUuid(supabase, item.productId),
        store_id: item.purchase?.storeId ?? null,
        quantity_g: item.toBuyBase,
        packages: item.purchase?.packages ?? null,
        package_price_pln: item.purchase ? groszeToPln(item.purchase.priceGrosze) : null,
        price_status: item.purchase?.status ?? null,
        in_pantry: item.toBuyBase <= 0,
        checked: false,
        checked_signature: null,
      });
    }
    if (shopItems.length > 0) await supabase.from("shopping_list_items").insert(shopItems);
  }
  return planId;
}

export interface PlanHistoryRow {
  id: string;
  startDate: string;
  pricedOn: string;
  status: string;
  targetKcal: number;
  basketPln: number;
  createdAt: string;
}

export async function listPlanHistory(supabase: SupabaseClient, userId: string): Promise<PlanHistoryRow[]> {
  const { data } = await supabase
    .from("meal_plans")
    .select("id, start_date, priced_on, status, target_kcal, basket_current_pln, basket_stale_pln, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []).map((row) => ({
    id: row.id,
    startDate: row.start_date,
    pricedOn: row.priced_on,
    status: row.status,
    targetKcal: row.target_kcal,
    basketPln: Number(row.basket_current_pln) + Number(row.basket_stale_pln),
    createdAt: row.created_at,
  }));
}

export async function loadPlanAssignment(
  supabase: SupabaseClient,
  userId: string,
  planId: string,
): Promise<{ startDate: string; generatedOn: string; fingerprint: string; assignment: MealPick[] } | null> {
  const { data } = await supabase
    .from("meal_plans")
    .select("start_date, priced_on, settings_fingerprint, assignment")
    .eq("user_id", userId)
    .eq("id", planId)
    .maybeSingle();
  if (!data) return null;
  const assignment = Array.isArray(data.assignment) ? (data.assignment as MealPick[]) : [];
  return {
    startDate: data.start_date,
    generatedOn: data.priced_on,
    fingerprint: data.settings_fingerprint,
    assignment,
  };
}
