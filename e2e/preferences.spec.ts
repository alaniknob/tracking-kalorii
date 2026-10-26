import { test } from "@playwright/test";
import { expectRegisterWall } from "./helpers";

test.describe("preferencje i alergie", () => {
  test("gość nie wchodzi w ustawienia", async ({ page }) => {
    await page.goto("/ustawienia/zywienie");
    await expectRegisterWall(page);
    await page.goto("/ustawienia/alergie");
    await expectRegisterWall(page);
  });
});
