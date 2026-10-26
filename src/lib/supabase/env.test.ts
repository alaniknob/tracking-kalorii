import { describe, expect, it } from "vitest";
import { isSupabaseAnonKey, isSupabaseUrl, readSupabasePublicConfig } from "./env";

describe("konfiguracja Supabase", () => {
  it("akceptuje klucz publishable jako NEXT_PUBLIC_SUPABASE_ANON_KEY", () => {
    expect(isSupabaseAnonKey("sb_publishable_testkey_abcdefghijklmnopqrstuvwx")).toBe(true);
    expect(isSupabaseUrl("https://example.supabase.co")).toBe(true);
  });

  it("akceptuje klasyczny klucz anon JWT", () => {
    expect(isSupabaseAnonKey("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.sig")).toBe(true);
  });

  it("odrzuca puste i ewidentnie złe wartości", () => {
    expect(isSupabaseAnonKey("")).toBe(false);
    expect(isSupabaseAnonKey("not-a-key")).toBe(false);
    expect(isSupabaseUrl("rdiaqecnmnvrimnqkvix.supabase.co")).toBe(false);
    expect(readSupabasePublicConfig({})).toEqual({ status: "missing" });
    expect(readSupabasePublicConfig({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co" })).toEqual({ status: "invalid" });
  });

  it("składa poprawną konfigurację z pary URL + klucz", () => {
    const result = readSupabasePublicConfig({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_testkey_abcdefghijklmnopqrstuvwx",
    });
    expect(result.status).toBe("ok");
  });
});
