import { test } from "@playwright/test";
import { expectRegisterWall } from "./helpers";

test.describe("kreator profilu", () => {
  test("gość nie wchodzi do kreatora", async ({ page }) => {
    await page.goto("/onboarding");
    await expectRegisterWall(page);
    await page.goto("/onboarding/cel");
    await expectRegisterWall(page);
    await page.goto("/onboarding/alergie");
    await expectRegisterWall(page);
  });
});
