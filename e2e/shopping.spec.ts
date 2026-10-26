import { test } from "@playwright/test";
import { expectRegisterWall } from "./helpers";

test.describe("lista zakupów", () => {
  test("gość nie wchodzi do zakupów", async ({ page }) => {
    await page.goto("/zakupy");
    await expectRegisterWall(page);
  });
});
