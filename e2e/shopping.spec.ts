import { expect, test, type Page } from "@playwright/test";

async function saveProfile(page: Page) {
  await page.goto("/onboarding");
  await page.getByLabel("Data urodzenia").fill("1990-05-10");
  await page.getByLabel("Wzrost (cm)").fill("172");
  await page.getByLabel("Masa ciała (kg)").fill("70");
  await page.getByLabel("Płeć fizjologiczna").selectOption("female");
  await page.getByLabel("Poziom aktywności").selectOption("moderate");
  await page.getByRole("button", { name: "Oblicz" }).click();
  await expect(page.getByTestId("nutrition-result")).toBeVisible();
  await page.getByRole("button", { name: "Zachowaj profil w tej karcie" }).click();
  await expect(page.getByTestId("profile-draft-saved")).toBeVisible();
}

async function generate(page: Page) {
  await page.getByTestId("generate-plan").click();
  await expect(page.getByTestId("generator-result")).toBeVisible();
}

const items = (page: Page) => page.getByTestId("shopping-list").locator('li[data-testid^="shop-"]');

test.describe("lista zakupów", () => {
  test("bez planu prowadzi do generatora", async ({ page }) => {
    await page.goto("/zakupy");
    await expect(page.getByTestId("demo-notice")).toBeVisible();
    await expect(page.getByTestId("plan-empty")).toBeVisible();
    await expect(page.getByTestId("go-generator")).toHaveAttribute("href", "/generator");
  });

  test("lista z planu: grupowanie, zapasy, odhaczanie i zapamiętanie w karcie", async ({ page }) => {
    await saveProfile(page);
    await page.goto("/generator");
    await page.getByTestId("pantry-add").click();
    await page.getByLabel("Produkt").selectOption({ label: "Kasza gryczana prażona" });
    await page.getByLabel("Ilość").fill("2");
    await page.getByLabel("Jednostka").selectOption("kg");
    await generate(page);

    await page.goto("/plan");
    await page.getByTestId("open-shopping").click();
    await expect(page).toHaveURL(/\/zakupy$/);
    const list = page.getByTestId("shopping-list");
    await expect(list).toBeVisible();

    const total = await items(page).count();
    expect(total).toBeGreaterThan(5);
    await expect(page.getByTestId("shopping-progress")).toContainText(`Kupione 0 z ${total}`);
    await expect(page.getByTestId("shopping-pantry")).toContainText("Kasza gryczana prażona");
    await expect(list.getByTestId("shop-kasza-gryczana")).toHaveCount(0);
    await expect(page.getByTestId("shopping-totals")).toContainText("zł");

    const byStore = page.getByRole("button", { name: "Według sklepu" });
    await byStore.click();
    await expect(byStore).toHaveAttribute("aria-pressed", "true");
    await expect(items(page)).toHaveCount(total);
    await page.getByRole("button", { name: "Według kategorii" }).click();
    await expect(page.getByTestId("group-vegetables")).toContainText("Warzywa");

    const first = items(page).first();
    const id = (await first.getAttribute("data-testid"))!;
    await first.getByRole("checkbox").check();
    await expect(page.getByTestId("shopping-progress")).toContainText(`Kupione 1 z ${total}`);
    await expect(page.getByTestId(id)).toHaveAttribute("data-state", "checked");

    await page.reload();
    await expect(page.getByTestId(id)).toHaveAttribute("data-state", "checked");
    await page.getByLabel("Ukryj kupione").check();
    await expect(page.getByTestId(id)).toHaveCount(0);
    await page.getByLabel("Ukryj kupione").uncheck();
    await page.getByTestId("shopping-clear").click();
    await expect(page.getByTestId("shopping-progress")).toContainText(`Kupione 0 z ${total}`);
  });

  test("po zmianie planu odhaczona pozycja z inną ilością wraca na listę", async ({ page }) => {
    await saveProfile(page);
    await page.goto("/generator");
    await generate(page);
    await page.goto("/zakupy");
    const first = items(page).first();
    await expect(first).toBeVisible();
    const id = (await first.getAttribute("data-testid"))!;
    const name = (await first.locator("span.font-medium").first().textContent())!.trim();
    await first.getByRole("checkbox").check();
    await expect(page.getByTestId(id)).toHaveAttribute("data-state", "checked");

    await page.goto("/generator");
    await page.getByTestId("pantry-add").click();
    await page.getByLabel("Produkt").selectOption({ label: name });
    await page.getByLabel("Ilość").fill("1");
    await generate(page);

    await page.goto("/zakupy");
    await expect(page.getByTestId(id)).toHaveAttribute("data-state", "changed");
    await expect(page.getByTestId("shopping-changed")).toBeVisible();
    await expect(page.getByTestId("shopping-progress")).toContainText("Kupione 0 z");
  });
});
