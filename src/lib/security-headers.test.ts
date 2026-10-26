import { describe, expect, it } from "vitest";
import { SECURITY_HEADERS } from "./security-headers";

describe("nagłówki bezpieczeństwa", () => {
  it("ustawia nosniff, DENY i referrer bez włączania CSP (Next inline)", () => {
    const map = Object.fromEntries(SECURITY_HEADERS.map((h) => [h.key, h.value]));
    expect(map["X-Content-Type-Options"]).toBe("nosniff");
    expect(map["X-Frame-Options"]).toBe("DENY");
    expect(map["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(map["Content-Security-Policy"]).toBeUndefined();
  });
});
