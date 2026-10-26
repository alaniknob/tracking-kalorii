import { expect, test } from "@playwright/test";
import { expectRegisterWall } from "./helpers";

test.describe("katalog produktów i przepisów", () => {
  test("gość nie wchodzi do katalogu", async ({ page }) => {
    await page.goto("/produkty");
    await expectRegisterWall(page);
    await page.goto("/przepisy");
    await expectRegisterWall(page);
  });
});

test("nawigacja gościa mieści się na ekranie bez przewijania w poziomie", async ({ page }) => {
  const viewport = page.viewportSize()!.width;
  for (const path of ["/", "/logowanie", "/rejestracja"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const widths = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth,
      inner: window.innerWidth,
      nav: document.querySelector<HTMLElement>("[data-testid=main-nav]")!.scrollWidth -
        document.querySelector<HTMLElement>("[data-testid=main-nav]")!.clientWidth,
    }));
    expect(widths.page, path).toBeLessThanOrEqual(viewport);
    expect(widths.inner, path).toBe(viewport);
    expect(widths.nav, path).toBeLessThanOrEqual(0);
  }
});
