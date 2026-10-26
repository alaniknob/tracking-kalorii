import { expect, test } from "@playwright/test";
import { expectRegisterWall } from "./helpers";

test.describe("konta bez sesji", () => {
  test("rejestracja i logowanie nie udają sesji", async ({ page }) => {
    await page.goto("/rejestracja");
    await expect(page.getByTestId("brak-konfiguracji").or(page.getByTestId("register-form"))).toBeVisible();

    await page.goto("/logowanie");
    await expect(page.getByTestId("brak-konfiguracji").or(page.getByTestId("login-form"))).toBeVisible();
    await expect(page.getByTestId("dashboard-user")).toHaveCount(0);
  });

  test("gość nie chodzi po aplikacji — produkt wraca do rejestracji", async ({ page }) => {
    for (const path of ["/panel", "/generator", "/plan", "/zakupy", "/onboarding", "/przepisy", "/produkty"]) {
      await page.goto(path);
      await expectRegisterWall(page);
    }
  });

  test("API v1 bez sesji nie udaje autoryzacji", async ({ request }) => {
    const me = await request.get("/api/v1/me");
    expect([401, 503]).toContain(me.status());
    const body = await me.json();
    if (me.status() === 503) expect(body).toEqual({ error: "brak_konfiguracji" });
    else expect(body).toEqual({ error: "unauthorized" });
    const plans = await request.get("/api/v1/plans");
    expect([401, 503]).toContain(plans.status());
  });
});
