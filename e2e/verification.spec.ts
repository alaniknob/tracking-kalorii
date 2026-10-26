import { expect, test } from "@playwright/test";
import { expectRegisterWall } from "./helpers";

test.describe("weryfikacja etap 8", () => {
  test("404 po polsku, bez stack trace", async ({ page }) => {
    const response = await page.goto("/tej-strony-nie-ma");
    expect(response?.status()).toBe(404);
    await expect(page.getByTestId("not-found")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nie znaleziono strony");
    await expect(page.locator("body")).not.toContainText("TypeError");
    await expect(page.locator("body")).not.toContainText("Error:");
  });

  test("nagłówki bezpieczeństwa na stronie głównej", async ({ request }) => {
    const response = await request.get("/");
    expect(response.ok()).toBe(true);
    const headers = response.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("posiłek bez konta wraca do rejestracji, nie do martwego ekranu", async ({ page }) => {
    await page.goto("/plan/posilki/1-1");
    await expectRegisterWall(page);
  });
});
