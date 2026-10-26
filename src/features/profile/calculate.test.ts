import { describe, expect, it } from "vitest";
import { evaluateProfile } from "./calculate";
import { DEFAULT_PROFILE_FORM_VALUES, readProfileFormData, type ProfileFormValues } from "./schema";

const REF = new Date("2026-10-26T12:00:00Z");

const valid: ProfileFormValues = {
  ...DEFAULT_PROFILE_FORM_VALUES,
  birthDate: "1996-01-10",
  heightCm: "180",
  weightKg: "80",
  sex: "male",
  activityLevel: "moderate",
  goal: "maintain",
  mealsPerDay: "4",
};

function errorsOf(values: Partial<ProfileFormValues>) {
  const state = evaluateProfile({ ...valid, ...values }, REF);
  return state.status === "invalid" ? state.fieldErrors : {};
}

describe("evaluateProfile — walidacja serwerowa", () => {
  it("przyjmuje poprawne dane i zwraca wynik", () => {
    const state = evaluateProfile(valid, REF);
    expect(state.status).toBe("success");
    if (state.status !== "success") return;
    expect(state.result.kind).toBe("ok");
    expect(state.result.kind === "ok" && state.result.bmrKcal).toBe(1780);
  });

  it("akceptuje przecinek dziesiętny", () => {
    const state = evaluateProfile({ ...valid, weightKg: "80,5" }, REF);
    expect(state.status).toBe("success");
  });

  it("wymaga pól obowiązkowych z polskim komunikatem", () => {
    const errors = errorsOf({ birthDate: "", heightCm: "", weightKg: "" });
    expect(errors.birthDate).toBe("To pole jest wymagane.");
    expect(errors.heightCm).toBe("To pole jest wymagane.");
    expect(errors.weightKg).toBe("To pole jest wymagane.");
  });

  it("odrzuca tekst zamiast liczby", () => {
    expect(errorsOf({ heightCm: "abc" }).heightCm).toBe("Podaj liczbę.");
  });

  it("odrzuca wartości spoza bezpiecznych zakresów", () => {
    expect(errorsOf({ heightCm: "90" }).heightCm).toBe("Podaj wartość od 120 do 230 cm.");
    expect(errorsOf({ weightKg: "500" }).weightKg).toBe("Podaj wartość od 35 do 300 kg.");
    expect(errorsOf({ mealsPerDay: "9" }).mealsPerDay).toBeDefined();
    expect(errorsOf({ mealsPerDay: "3,5" }).mealsPerDay).toBe("Podaj liczbę całkowitą.");
  });

  it("odrzuca niepoprawną i przyszłą datę urodzenia oraz wiek spoza zakresu", () => {
    expect(errorsOf({ birthDate: "10.01.1996" }).birthDate).toBe("Podaj prawidłową datę urodzenia.");
    expect(errorsOf({ birthDate: "2030-01-01" }).birthDate).toBe("Data urodzenia nie może być z przyszłości.");
    expect(errorsOf({ birthDate: "2020-01-01" }).birthDate).toMatch(/od 10 do 100 lat/);
    expect(errorsOf({ birthDate: "1900-01-01" }).birthDate).toMatch(/od 10 do 100 lat/);
  });

  it("odrzuca nieznane opcje (manipulacja formularzem)", () => {
    expect(errorsOf({ goal: "starve" }).goal).toBe("Wybierz jedną z dostępnych opcji.");
    expect(errorsOf({ healthFlags: ["hack"] }).healthFlags).toBe("Wybierz jedną z dostępnych opcji.");
  });

  it("sprawdza spójność masy docelowej z celem", () => {
    expect(errorsOf({ goal: "lose_weight", targetWeightKg: "85" }).targetWeightKg).toMatch(/niższa/);
    expect(errorsOf({ goal: "build_muscle", targetWeightKg: "75" }).targetWeightKg).toMatch(/wyższa/);
    expect(evaluateProfile({ ...valid, goal: "maintain", targetWeightKg: "60" }, REF).status).toBe("success");
  });

  it("osoba niepełnoletnia przechodzi walidację, ale dostaje wynik ograniczony", () => {
    const state = evaluateProfile({ ...valid, birthDate: "2011-05-01" }, REF);
    expect(state.status === "success" && state.result).toEqual({ kind: "restricted", reasons: ["minor"] });
  });
});

describe("readProfileFormData", () => {
  it("czyta wielokrotne pola i brakujące wartości jako pusty tekst", () => {
    const fd = new FormData();
    fd.append("healthFlags", "pregnancy");
    fd.append("healthFlags", "diabetes");
    const values = readProfileFormData(fd);
    expect(values.healthFlags).toEqual(["pregnancy", "diabetes"]);
    expect(values.heightCm).toBe("");
  });
});
