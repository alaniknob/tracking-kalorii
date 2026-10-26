import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("strona główna ładuje się po polsku", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Tracking Kalorii/);
    await expect(page.locator("html")).toHaveAttribute("lang", "pl");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Plan żywienia");
    await expect(page.getByRole("link", { name: "Oblicz zapotrzebowanie" })).toBeVisible();
  });

  test("niedostępny ekran jest wyraźnie oznaczony", async ({ page }) => {
    await page.goto("/panel");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Panel");
    await expect(page.getByTestId("unavailable-notice")).toContainText("etapie 7");
  });

  test("każdy link z listy ekranów prowadzi do istniejącej strony", async ({ page, request }) => {
    await page.goto("/");
    const hrefs = await page.locator("#ekrany a").evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    expect(hrefs.length).toBeGreaterThan(5);
    for (const href of hrefs) {
      const response = await request.get(href!);
      expect(response.status(), href!).toBe(200);
    }
  });
});
