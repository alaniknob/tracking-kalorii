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
  await page.goto("/generator");
  await expect(page.getByTestId("overview-profile")).not.toContainText("Brak profilu");
  await page.getByTestId("generate-plan").click();
}

async function saveBudget(page: Page, amount: string) {
  await page.goto("/ustawienia/budzet");
  await page.getByLabel("Tygodniowy budżet na żywność").fill(amount);
  await page.getByRole("button", { name: "Zapisz budżet" }).click();
  await expect(page.getByTestId("budget-saved")).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  const viewport = page.viewportSize()!.width;
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(viewport);
}

test.describe("generator jadłospisu", () => {
  test("bez profilu generator prowadzi do profilu zamiast pokazywać martwy przycisk", async ({ page }) => {
    await page.goto("/generator");
    await expect(page.getByTestId("demo-notice")).toContainText("PRZYKŁADOWYCH");
    await expect(page.getByTestId("planner-needs-profile")).toBeVisible();
    await expect(page.getByTestId("generate-plan")).toHaveCount(0);
    await page.getByTestId("planner-needs-profile").getByRole("link", { name: "Przejdź do profilu" }).click();
    await expect(page).toHaveURL(/\/onboarding$/);

    await page.goto("/plan");
    await expect(page.getByTestId("plan-empty")).toBeVisible();
    await expect(page.getByTestId("go-generator")).toHaveAttribute("href", "/generator");
  });

  test("profil → generator → tydzień → posiłek; zmiana ustawień unieważnia plan", async ({ page }) => {
    await saveProfile(page);
    await page.getByRole("link", { name: /generatora/ }).first().click();
    await expect(page).toHaveURL(/\/generator$/);
    await expect(page.getByTestId("overview-profile")).toContainText("kcal dziennie");
    await expect(page.getByTestId("overview-budget")).toContainText("Brak");

    await page.getByTestId("generate-plan").click();
    const result = page.getByTestId("generator-result");
    await expect(result).toBeVisible();
    await expect(page.getByTestId("days-within")).toHaveText("7 / 7");
    await expect(page.getByTestId("plan-no-budget")).toBeVisible();
    await expect(page.getByTestId("cost-used")).toContainText("zł");
    await expect(page.getByTestId("cost-packages")).toContainText("zł");
    await expect(page.getByTestId("cost-basket")).toContainText("zł");
    await expectNoHorizontalOverflow(page);

    await page.getByTestId("open-week").click();
    await expect(page).toHaveURL(/\/plan$/);
    await expect(page.getByTestId("week-view")).toBeVisible();
    for (let day = 1; day <= 7; day++) await expect(page.getByTestId(`day-${day}`)).toBeVisible();
    await expect(page.getByTestId("day-1").getByRole("link")).toHaveCount(4);
    await expect(page.getByTestId("plan-basket")).toContainText("Koszt koniecznych opakowań");
    await expect(page.getByTestId("plan-pricing-note")).toContainText("Sklepy: wszystkie z listy");
    await expectNoHorizontalOverflow(page);

    const firstMeal = page.getByTestId("meal-1-1");
    const recipeName = (await firstMeal.locator("span.block").first().textContent())!.trim();
    await firstMeal.click();
    await expect(page).toHaveURL(/\/plan\/posilki\/1-1$/);
    await expect(page.getByTestId("meal-recipe-name")).toHaveText(recipeName);
    await expect(page.getByTestId("meal-nutrition")).toContainText("kcal");
    await expect(page.getByTestId("meal-ingredients").getByRole("listitem").first()).toBeVisible();
    await expect(page.getByTestId("meal-cost")).toContainText("zł");
    await expectNoHorizontalOverflow(page);
    await page.getByRole("link", { name: /Wróć do tygodnia/ }).click();
    await expect(page.getByTestId("week-view")).toBeVisible();

    await page.goto("/plan/posilki/9-9");
    await expect(page.getByTestId("meal-not-found")).toBeVisible();

    await saveBudget(page, "300");
    await page.goto("/plan");
    await expect(page.getByTestId("plan-settings-changed")).toBeVisible();
    await expect(page.getByTestId("week-view")).toHaveCount(0);
  });

  test("alergia na mleko wyklucza nabiał z planu także przy budżecie", async ({ page }) => {
    await saveProfile(page);
    await page.goto("/ustawienia/alergie");
    await page.getByRole("radiogroup", { name: "Mleko (w tym laktoza)", exact: true }).getByText("Alergia").click();
    await page.getByRole("button", { name: "Sprawdź i zapisz w tej karcie" }).click();
    await expect(page.getByTestId("settings-saved")).toBeVisible();
    await saveBudget(page, "80");

    await generate(page);
    await expect(page.getByTestId("generator-result")).toBeVisible();
    await expect(page.getByTestId("plan-warnings")).toContainText("weryfikacji składu");
    await page.getByTestId("open-week").click();
    const week = page.getByTestId("week-view");
    await expect(week).toBeVisible();
    await expect(page.getByTestId("plan-basket")).not.toContainText("Jogurt");
    await expect(page.getByTestId("plan-basket")).not.toContainText("Mleko");
    await expect(page.getByTestId("plan-basket")).not.toContainText("Twaróg");
  });

  test("za niski budżet: diagnoza z potrzebną kwotą, bez łagodzenia ograniczeń", async ({ page }) => {
    await saveProfile(page);
    await saveBudget(page, "20");
    await generate(page);
    await expect(page.getByTestId("plan-summary")).toHaveAttribute("data-status", "over_budget");
    await expect(page.getByTestId("budget-diagnosis")).toHaveAttribute("data-status", "over");
    await expect(page.getByTestId("required-budget")).toContainText("zł");
    await expect(page.getByTestId("shortfall")).toContainText("zł");
    await expect(page.getByTestId("budget-suggestions")).toBeVisible();
  });

  test("limit czasu 15 min: brak obiadu, konkretna podpowiedź", async ({ page }) => {
    await saveProfile(page);
    await page.goto("/ustawienia/zywienie");
    await page.getByLabel("Maks. czas przygotowania posiłku").selectOption("15");
    await page.getByRole("button", { name: "Sprawdź i zapisz w tej karcie" }).click();
    await expect(page.getByTestId("settings-saved")).toBeVisible();

    await generate(page);
    const infeasible = page.getByTestId("plan-infeasible");
    await expect(infeasible).toBeVisible();
    await expect(infeasible).toContainText("Brak przepisów na posiłek „Obiad”");
    const remedy = infeasible.locator('[data-code="raise_prep_time"]');
    await expect(remedy).toContainText("Zwiększ maksymalny czas przygotowania do co najmniej");
    await expect(remedy.getByRole("link", { name: "Zmień" })).toHaveAttribute("href", "/ustawienia/zywienie");
  });

  test("zapasy: walidacja, odliczenie od koszyka i zapamiętanie w karcie", async ({ page }) => {
    await saveProfile(page);
    await page.goto("/generator");
    await page.getByTestId("pantry-add").click();
    await page.getByLabel("Produkt").selectOption({ label: "Kasza gryczana prażona" });
    await page.getByTestId("generate-plan").click();
    await expect(page.getByTestId("generator-invalid")).toBeVisible();
    await expect(page.getByTestId("pantry-row-1")).toContainText("Podaj ilość większą od 0.");

    await page.getByLabel("Ilość").fill("400");
    await expect(page.getByLabel("Jednostka")).toHaveValue("g");
    await page.getByTestId("generate-plan").click();
    await expect(page.getByTestId("generator-result")).toBeVisible();

    await page.goto("/plan");
    await expect(page.getByTestId("plan-pantry")).toContainText("Kasza gryczana prażona");
    await page.goto("/generator");
    await expect(page.getByLabel("Ilość")).toHaveValue("400");
  });

  test("ręczna zamiana posiłku na inny przepis z listy zamienników", async ({ page }) => {
    await saveProfile(page);
    await generate(page);
    await expect(page.getByTestId("generator-result")).toBeVisible();
    await page.goto("/plan/posilki/1-1");
    await expect(page.getByTestId("meal-recipe-name")).toBeVisible();
    const original = (await page.getByTestId("meal-recipe-name").textContent())!.trim();
    const swap = page.getByTestId("meal-swap");
    await expect(swap).toBeVisible();
    const button = swap.getByRole("button", { name: "Zamień" }).first();
    await expect(button).toBeVisible();
    await button.click();
    await expect(page.getByTestId("meal-recipe-name")).not.toHaveText(original, { timeout: 15_000 });
    await page.goto("/plan");
    await expect(page.getByTestId("week-view")).toBeVisible();
    await expect(page.getByTestId("meal-1-1")).not.toContainText(original);
  });

  test("weganin z preferowanym „jogurt” — konflikt pokazany i rozstrzygnięty", async ({ page }) => {
    await page.goto("/ustawienia/zywienie");
    await page.getByLabel("Tradycyjna").uncheck();
    await page.getByLabel("Wegańska").check();
    await page.getByLabel("Preferowane produkty").fill("jogurt");
    await page.getByRole("button", { name: "Sprawdź i zapisz w tej karcie" }).click();
    await expect(page.getByTestId("settings-saved")).toBeVisible();
    await expect(page.getByTestId("conflicts-resolved")).toContainText(
      "„jogurt” usunięto z preferowanych: wszystkie pasujące produkty z katalogu (Jogurt naturalny)",
    );
  });
});
