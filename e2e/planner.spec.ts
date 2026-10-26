import { test } from "@playwright/test";
import { expectRegisterWall } from "./helpers";

test.describe("generator jadłospisu", () => {
  test("gość nie wchodzi do generatora ani planu", async ({ page }) => {
    await page.goto("/generator");
    await expectRegisterWall(page);
    await page.goto("/plan");
    await expectRegisterWall(page);
    await page.goto("/plan/posilki/1-1");
    await expectRegisterWall(page);
  });
});
