"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { DRAFT_KEYS } from "@/lib/draft-keys";
import { getAuthState } from "./session";
import { saveNormalizedSettings, savePlanRows } from "./repository";
import type { PlanView } from "@/features/meal-planning/view";
import type { MealPick } from "@/features/meal-planning/generate";

export type DraftBundle = {
  profile: string;
  diet: string;
  restrictions: string;
  stores: string;
  budget: string;
  pantry: string;
  priceImport: string;
  shoppingChecked: string;
  plan: string;
};

const EMPTY_DRAFTS: DraftBundle = {
  profile: "",
  diet: "",
  restrictions: "",
  stores: "",
  budget: "",
  pantry: "",
  priceImport: "",
  shoppingChecked: "",
  plan: "",
};

const DRAFT_COLUMNS: Record<string, string> = {
  [DRAFT_KEYS.profile]: "profile_json",
  [DRAFT_KEYS.diet]: "diet_json",
  [DRAFT_KEYS.restrictions]: "restrictions_json",
  [DRAFT_KEYS.stores]: "stores_json",
  [DRAFT_KEYS.budget]: "budget_json",
  [DRAFT_KEYS.pantry]: "pantry_json",
  [DRAFT_KEYS.priceImport]: "price_import_json",
  [DRAFT_KEYS.shoppingChecked]: "shopping_checked_json",
};

function asJson(value: string): unknown {
  if (value.trim() === "") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export async function loadAccountDraftsAction(): Promise<
  { status: "skipped" } | { status: "ready"; drafts: DraftBundle; empty: boolean }
> {
  const auth = await getAuthState();
  if (auth.status !== "authenticated") return { status: "skipped" };
  const supabase = await createServerSupabase();
  if (!supabase) return { status: "skipped" };

  const { data } = await supabase.from("user_drafts").select("*").eq("user_id", auth.userId).maybeSingle();
  if (!data) return { status: "ready", drafts: EMPTY_DRAFTS, empty: true };

  let plan = "";
  if (data.current_plan_id) {
    const { data: mealPlan } = await supabase
      .from("meal_plans")
      .select("id, start_date, priced_on, settings_fingerprint, assignment")
      .eq("id", data.current_plan_id)
      .maybeSingle();
    if (mealPlan) {
      plan = JSON.stringify({
        startDate: mealPlan.start_date,
        generatedOn: mealPlan.priced_on,
        fingerprint: mealPlan.settings_fingerprint,
        assignment: mealPlan.assignment,
        planId: mealPlan.id,
      });
    }
  }

  const drafts: DraftBundle = {
    profile: asText(data.profile_json),
    diet: asText(data.diet_json),
    restrictions: asText(data.restrictions_json),
    stores: asText(data.stores_json),
    budget: asText(data.budget_json),
    pantry: asText(data.pantry_json),
    priceImport: asText(data.price_import_json),
    shoppingChecked: asText(data.shopping_checked_json),
    plan,
  };
  const empty = Object.values(drafts).every((value) => value === "");
  return { status: "ready", drafts, empty };
}

export async function persistDraftAction(key: string, value: string): Promise<void> {
  const auth = await getAuthState();
  if (auth.status !== "authenticated") return;
  const supabase = await createServerSupabase();
  if (!supabase) return;
  const column = DRAFT_COLUMNS[key];
  if (!column) return;

  const payload: Record<string, unknown> = { user_id: auth.userId, [column]: asJson(value) };
  await supabase.from("user_drafts").upsert(payload, { onConflict: "user_id" });
  await saveNormalizedSettings(supabase, auth.userId, key, value);
}

export async function persistAllDraftsAction(drafts: DraftBundle): Promise<void> {
  const auth = await getAuthState();
  if (auth.status !== "authenticated") return;
  const supabase = await createServerSupabase();
  if (!supabase) return;
  await supabase.from("user_drafts").upsert(
    {
      user_id: auth.userId,
      profile_json: asJson(drafts.profile),
      diet_json: asJson(drafts.diet),
      restrictions_json: asJson(drafts.restrictions),
      stores_json: asJson(drafts.stores),
      budget_json: asJson(drafts.budget),
      pantry_json: asJson(drafts.pantry),
      price_import_json: asJson(drafts.priceImport),
      shopping_checked_json: asJson(drafts.shoppingChecked),
    },
    { onConflict: "user_id" },
  );
  for (const [key, value] of [
    [DRAFT_KEYS.profile, drafts.profile],
    [DRAFT_KEYS.diet, drafts.diet],
    [DRAFT_KEYS.restrictions, drafts.restrictions],
    [DRAFT_KEYS.stores, drafts.stores],
    [DRAFT_KEYS.budget, drafts.budget],
    [DRAFT_KEYS.pantry, drafts.pantry],
    [DRAFT_KEYS.priceImport, drafts.priceImport],
    [DRAFT_KEYS.shoppingChecked, drafts.shoppingChecked],
  ] as const) {
    await saveNormalizedSettings(supabase, auth.userId, key, value);
  }
}

export async function persistGeneratedPlanAction(params: {
  view: PlanView;
  fingerprint: string;
  assignment: MealPick[];
}): Promise<string | null> {
  const auth = await getAuthState();
  if (auth.status !== "authenticated") return null;
  const supabase = await createServerSupabase();
  if (!supabase) return null;
  const planId = await savePlanRows(supabase, auth.userId, params);
  if (planId) {
    await supabase.from("user_drafts").upsert({ user_id: auth.userId, current_plan_id: planId }, { onConflict: "user_id" });
  }
  return planId;
}

export async function persistShoppingCheckedAction(checked: Record<string, string>): Promise<void> {
  await persistDraftAction(DRAFT_KEYS.shoppingChecked, JSON.stringify(checked));
  const auth = await getAuthState();
  if (auth.status !== "authenticated") return;
  const supabase = await createServerSupabase();
  if (!supabase) return;
  const { data: drafts } = await supabase.from("user_drafts").select("current_plan_id").eq("user_id", auth.userId).maybeSingle();
  if (!drafts?.current_plan_id) return;
  const { data: list } = await supabase.from("shopping_lists").select("id").eq("meal_plan_id", drafts.current_plan_id).maybeSingle();
  if (!list) return;
  const { data: items } = await supabase.from("shopping_list_items").select("id, product_slug").eq("shopping_list_id", list.id);
  for (const item of items ?? []) {
    const signature = checked[item.product_slug];
    await supabase
      .from("shopping_list_items")
      .update({ checked: Boolean(signature), checked_signature: signature ?? null })
      .eq("id", item.id);
  }
}

