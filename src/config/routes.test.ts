import { describe, expect, it } from "vitest";
import { allowsIncompleteProfile, isProtectedAppPath, isWizardPath } from "./routes";

describe("ścieżki produktu", () => {
  it("strona główna i auth są publiczne", () => {
    expect(isProtectedAppPath("/")).toBe(false);
    expect(isProtectedAppPath("/logowanie")).toBe(false);
    expect(isProtectedAppPath("/rejestracja")).toBe(false);
    expect(isProtectedAppPath("/tej-strony-nie-ma")).toBe(false);
  });

  it("plan, generator i katalog wymagają konta", () => {
    expect(isProtectedAppPath("/generator")).toBe(true);
    expect(isProtectedAppPath("/plan/posilki/1-1")).toBe(true);
    expect(isProtectedAppPath("/przepisy/owsianka-bananowa")).toBe(true);
    expect(isProtectedAppPath("/onboarding/cel")).toBe(true);
  });

  it("kreator i profil działają przy niepełnym profilu", () => {
    expect(isWizardPath("/onboarding/budzet")).toBe(true);
    expect(allowsIncompleteProfile("/onboarding")).toBe(true);
    expect(allowsIncompleteProfile("/profil")).toBe(true);
    expect(allowsIncompleteProfile("/generator")).toBe(false);
  });
});
