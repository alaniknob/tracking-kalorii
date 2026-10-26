import { expect, test } from "@playwright/test";
import { expectRegisterWall } from "./helpers";

test.describe("smoke", () => {
  test("strona główna ładuje się po polsku i wymaga rejestracji", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Tracking Kalorii/);
    await expect(page.locator("html")).toHaveAttribute("lang", "pl");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Plan żywienia");
    await expectRegisterWall(page);
    await expect(page.getByRole("link", { name: "Oblicz zapotrzebowanie" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Ekrany aplikacji" })).toHaveCount(0);
  });

  test("logowanie bez sesji pokazuje formularz albo brak konfiguracji, a nie udaje sesji", async ({ page }) => {
    await page.goto("/logowanie");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Logowanie");
    await expect(page.getByTestId("brak-konfiguracji").or(page.getByTestId("login-form"))).toBeVisible();
    await expect(page.getByTestId("dashboard-user")).toHaveCount(0);
  });
});
