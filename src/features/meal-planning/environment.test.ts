import { describe, expect, it } from "vitest";
import { confirmedTotal } from "@/features/pricing/cost";
import { loadPlannerEnvironment, planFingerprint, runPlanner, sanitizePlannerDrafts } from "./environment";
import { buildPlanView } from "./view";

const TODAY = "2026-10-26";

const PROFILE = JSON.stringify({
  birthDate: "1990-05-10",
  heightCm: "172",
  weightKg: "70",
  targetWeightKg: "",
  sex: "female",
  activityLevel: "moderate",
  goal: "maintain",
  mealsPerDay: "4",
  healthFlags: [],
});

const drafts = (over: Record<string, string> = {}) => sanitizePlannerDrafts({ profile: PROFILE, ...over });

describe("środowisko generatora", () => {
  it("wylicza cel z profilu na nowo; bez profilu generator nie działa", async () => {
    const env = await loadPlannerEnvironment(drafts(), TODAY);
    expect(env.profile.status).toBe("ok");
    if (env.profile.status !== "ok") return;
    expect(env.profile.mealsPerDay).toBe(4);
    expect(env.profile.targets.kcal).toBeGreaterThan(1500);

    const none = await loadPlannerEnvironment(drafts({ profile: "" }), TODAY);
    expect(none.profile.status).toBe("missing");
    expect(runPlanner(none)).toBeNull();

    const broken = await loadPlannerEnvironment(drafts({ profile: "{nie-json" }), TODAY);
    expect(broken.profile.status).toBe("invalid");
  });

  it("osoba niepełnoletnia nie dostaje automatycznego planu", async () => {
    const minor = JSON.stringify({ ...JSON.parse(PROFILE), birthDate: "2012-01-01" });
    const env = await loadPlannerEnvironment(drafts({ profile: minor }), TODAY);
    expect(env.profile.status).toBe("restricted");
    expect(runPlanner(env)).toBeNull();
  });

  it("odcisk ustawień zmienia się przy każdej zmianie wersji roboczej i ignoruje pola spoza listy", () => {
    const base = planFingerprint(drafts());
    expect(planFingerprint(drafts())).toBe(base);
    expect(planFingerprint(drafts({ pantry: '[{"productId":"jaja","amount":"2","unit":"szt"}]' }))).not.toBe(base);
    expect(planFingerprint(drafts({ restrictions: "{}" }))).not.toBe(base);
    expect(planFingerprint(sanitizePlannerDrafts({ profile: PROFILE, extra: "x" }))).toBe(base);
  });

  it("odtworzenie z tych samych ustawień i daty daje identyczny widok planu", async () => {
    const make = async () => {
      const env = await loadPlannerEnvironment(drafts(), TODAY);
      const outcome = runPlanner(env);
      if (outcome?.status !== "planned") throw new Error("expected plan");
      return buildPlanView(outcome.plan, env.pricing, env.pantry, "2026-10-27");
    };
    expect(JSON.stringify(await make())).toBe(JSON.stringify(await make()));
  });
});

describe("widok planu", () => {
  it("dni z datami, unikalne posiłki, resztki połączone w obie strony, koszty posiłków sumują się do kosztu zużytego", async () => {
    const env = await loadPlannerEnvironment(drafts(), TODAY);
    const outcome = runPlanner(env);
    if (outcome?.status !== "planned") throw new Error("expected plan");
    const view = buildPlanView(outcome.plan, env.pricing, env.pantry, "2026-10-27");

    expect(view.days.map((d) => d.date)).toEqual([
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
    ]);
    expect(new Set(view.meals.map((m) => m.id)).size).toBe(28);
    expect(view.days[0].mealIds).toEqual(["1-1", "1-2", "1-3", "1-4"]);
    for (const meal of view.meals) {
      if (meal.leftoverOfId) {
        const source = view.meals.find((m) => m.id === meal.leftoverOfId)!;
        expect(source.leftoverForId).toBe(meal.id);
        expect(meal.prepMinutes).toBe(0);
      }
    }

    const mealsUsed = view.meals.reduce((s, m) => s + confirmedTotal(m.cost) + m.cost.estimated, 0);
    const planUsed = confirmedTotal(view.full.used) + view.full.used.estimated;
    // Zaokrąglenia do grosza na poziomie posiłku vs produktu.
    expect(Math.abs(mealsUsed - planUsed)).toBeLessThanOrEqual(view.meals.length * 2);
  });

  it("składniki porcji są przeliczone z przepisu (ilość × porcja / liczba porcji)", async () => {
    const env = await loadPlannerEnvironment(drafts(), TODAY);
    const outcome = runPlanner(env);
    if (outcome?.status !== "planned") throw new Error("expected plan");
    const view = buildPlanView(outcome.plan, env.pricing, env.pantry, TODAY);
    const meal = view.meals[0];
    const recipe = env.recipes.find((r) => r.id === meal.recipeId)!;
    meal.ingredients.forEach((ing, i) => {
      expect(ing.amount).toBeCloseTo((recipe.ingredients[i].amount * meal.factor) / recipe.servings, 6);
    });
  });
});
