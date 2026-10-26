import { describe, expect, it } from "vitest";
import { isSafeInternalPath } from "./safe-path";

describe("isSafeInternalPath", () => {
  it("akceptuje ścieżki aplikacji", () => {
    expect(isSafeInternalPath("/panel")).toBe(true);
    expect(isSafeInternalPath("/plan/posilki/1-1")).toBe(true);
  });

  it("odrzuca open redirect", () => {
    expect(isSafeInternalPath("https://evil.example")).toBe(false);
    expect(isSafeInternalPath("//evil.example")).toBe(false);
    expect(isSafeInternalPath("/\\evil.example")).toBe(false);
    expect(isSafeInternalPath("panel")).toBe(false);
  });
});
