import { describe, expect, it } from "vitest";
import { hasSupabaseAuthCookie, isAuthRelatedPath } from "./session-cookie";

describe("sesja Supabase — kiedy wolno wołać sieć", () => {
  it("wykrywa ciasteczko auth", () => {
    expect(hasSupabaseAuthCookie([{ name: "sb-abc-auth-token" }])).toBe(true);
    expect(hasSupabaseAuthCookie([{ name: "theme" }])).toBe(false);
  });

  it("ścieżki konta vs gość", () => {
    expect(isAuthRelatedPath("/logowanie")).toBe(true);
    expect(isAuthRelatedPath("/profil")).toBe(true);
    expect(isAuthRelatedPath("/generator")).toBe(false);
    expect(isAuthRelatedPath("/onboarding")).toBe(false);
    expect(isAuthRelatedPath("/zakupy")).toBe(false);
  });
});
