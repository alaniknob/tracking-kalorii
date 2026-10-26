import { expect, test } from "@playwright/test";

test.describe("konta bez konfiguracji Supabase", () => {
  test("rejestracja i logowanie pokazują brak konfiguracji", async ({ page }) => {
    await page.goto("/rejestracja");
    await expect(page.getByTestId("brak-konfiguracji")).toBeVisible();
    await expect(page.getByTestId("register-form")).toHaveCount(0);

    await page.goto("/logowanie");
    await expect(page.getByTestId("brak-konfiguracji")).toBeVisible();
    await expect(page.getByRole("button", { name: "Zaloguj się" })).toHaveCount(0);
  });

  test("panel i historia są dostępne, bez udawania zapisu na koncie", async ({ page }) => {
    await page.goto("/panel");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Panel");
    await expect(page.getByTestId("brak-konfiguracji")).toBeVisible();
    await expect(page.getByRole("link", { name: "Generator jadłospisu" })).toBeVisible();

    await page.goto("/historia");
    await expect(page.getByTestId("brak-konfiguracji")).toBeVisible();

    await page.goto("/profil");
    await expect(page.getByTestId("brak-konfiguracji")).toBeVisible();
    await expect(page.getByTestId("delete-account")).toHaveCount(0);
  });

  test("API v1 nie udaje autoryzacji bez konfiguracji", async ({ request }) => {
    const me = await request.get("/api/v1/me");
    expect(me.status()).toBe(503);
    expect(await me.json()).toEqual({ error: "brak_konfiguracji" });
    const plans = await request.get("/api/v1/plans");
    expect(plans.status()).toBe(503);
  });
});
