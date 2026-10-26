import { test } from "@playwright/test";
import { expectRegisterWall } from "./helpers";

test.describe("ceny, sklepy i budżet", () => {
  test("gość nie wchodzi do cen, sklepów i budżetu", async ({ page }) => {
    await page.goto("/ceny");
    await expectRegisterWall(page);
    await page.goto("/ustawienia/sklepy");
    await expectRegisterWall(page);
    await page.goto("/ustawienia/budzet");
    await expectRegisterWall(page);
  });
});
