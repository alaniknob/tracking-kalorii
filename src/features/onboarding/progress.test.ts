import { describe, expect, it } from "vitest";
import { DEFAULT_DIET_FORM_VALUES, DEFAULT_RESTRICTIONS_FORM_VALUES } from "@/features/preferences/schema";
import { DEFAULT_PROFILE_FORM_VALUES, type ProfileFormValues } from "@/features/profile/schema";
import {
  firstIncompleteWizardPath,
  isGoalComplete,
  isProfileBodyComplete,
  isWizardComplete,
  resumePathForStep,
  type WizardDrafts,
} from "./progress";

const REF = new Date("2026-10-26T12:00:00Z");

const profileBody: ProfileFormValues = {
  ...DEFAULT_PROFILE_FORM_VALUES,
  birthDate: "1996-01-10",
  heightCm: "180",
  weightKg: "80",
  sex: "male",
  activityLevel: "moderate",
  mealsPerDay: "4",
  goal: "",
};

const diet = JSON.stringify(DEFAULT_DIET_FORM_VALUES);
const restrictions = JSON.stringify(DEFAULT_RESTRICTIONS_FORM_VALUES);
const stores = JSON.stringify({ chains: ["lidl"], customStores: "" });
const budget = JSON.stringify({ weeklyBudget: "250", allowEstimates: "on" });

function drafts(partial: Partial<WizardDrafts> = {}): WizardDrafts {
  return {
    profile: "",
    diet: "",
    restrictions: "",
    stores: "",
    budget: "",
    ...partial,
  };
}

describe("postęp kreatora", () => {
  it("puste szkice wracają do danych ciała", () => {
    expect(firstIncompleteWizardPath(drafts(), REF)).toBe("/onboarding");
    expect(isWizardComplete(drafts(), REF)).toBe(false);
  });

  it("profil bez celu i z czasem przygotowania otwiera krok celu", () => {
    const profile = JSON.stringify(profileBody);
    expect(isProfileBodyComplete(profile, diet, REF)).toBe(true);
    expect(isGoalComplete(profile, REF)).toBe(false);
    expect(firstIncompleteWizardPath(drafts({ profile, diet }), REF)).toBe("/onboarding/cel");
  });

  it("zapisany cel zalicza krok celu i przechodzi do alergii", () => {
    const profile = JSON.stringify({ ...profileBody, goal: "maintain" });
    expect(isGoalComplete(profile, REF)).toBe(true);
    expect(firstIncompleteWizardPath(drafts({ profile, diet }), REF)).toBe("/onboarding/alergie");
  });

  it("wybrany cel bez alergii wraca do alergii", () => {
    const profile = JSON.stringify({ ...profileBody, goal: "lose_weight", targetWeightKg: "72" });
    expect(firstIncompleteWizardPath(drafts({ profile, diet }), REF)).toBe("/onboarding/alergie");
  });

  it("alergie bez sklepów wracają do sklepów", () => {
    const profile = JSON.stringify({ ...profileBody, goal: "maintain" });
    expect(firstIncompleteWizardPath(drafts({ profile, diet, restrictions }), REF)).toBe("/onboarding/sklepy");
  });

  it("sklepy bez budżetu wracają do budżetu", () => {
    const profile = JSON.stringify({ ...profileBody, goal: "maintain" });
    expect(firstIncompleteWizardPath(drafts({ profile, diet, restrictions, stores }), REF)).toBe("/onboarding/budzet");
  });

  it("pełny zestaw pomija kreator", () => {
    const profile = JSON.stringify({ ...profileBody, goal: "maintain" });
    const complete = drafts({ profile, diet, restrictions, stores, budget });
    expect(firstIncompleteWizardPath(complete, REF)).toBeNull();
    expect(isWizardComplete(complete, REF)).toBe(true);
    expect(resumePathForStep("profile", complete, REF)).toBe("/");
  });

  it("nie pozwala przeskoczyć niedokończonego kroku", () => {
    const profile = JSON.stringify(profileBody);
    expect(resumePathForStep("allergies", drafts({ profile, diet }), REF)).toBe("/onboarding/cel");
    expect(resumePathForStep("goal", drafts({ profile, diet }), REF)).toBeNull();
  });

  it("odrzuca profil poza zakresem", () => {
    const profile = JSON.stringify({ ...profileBody, heightCm: "50" });
    expect(isProfileBodyComplete(profile, diet, REF)).toBe(false);
  });

  it("wymaga zapisanego czasu przygotowania w szkicu diety", () => {
    const profile = JSON.stringify(profileBody);
    expect(isProfileBodyComplete(profile, "", REF)).toBe(false);
  });
});
