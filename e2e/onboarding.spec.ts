import { expect, test, type Page } from "@playwright/test";

async function fillBody(page: Page, { birthDate, height, weight }: { birthDate: string; height: string; weight: string }) {
  await page.getByLabel("Data urodzenia").fill(birthDate);
  await page.getByLabel("Wzrost (cm)").fill(height);
  await page.getByLabel("Masa ciała (kg)").fill(weight);
}

test.describe("profil i kalkulator", () => {
  test("oblicza BMR, TDEE i proponowaną kaloryczność", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Oblicz zapotrzebowanie" }).click();
    await expect(page).toHaveURL(/\/onboarding$/);

    await fillBody(page, { birthDate: "1990-03-15", height: "180", weight: "80" });
    await page.getByLabel("Płeć fizjologiczna").selectOption("male");
    await page.getByLabel("Cel", { exact: true }).selectOption("lose_weight");
    await page.getByLabel("Poziom aktywności").selectOption("moderate");
    await page.getByRole("button", { name: "Oblicz" }).click();

    const result = page.getByTestId("nutrition-result");
    await expect(result).toBeVisible();
    await expect(result).toContainText("BMR");
    await expect(result).toContainText("TDEE");
    await expect(result).toContainText("Proponowana kaloryczność");
    await expect(result).toContainText("Brak planu");
    await expect(page.getByLabel("Wzrost (cm)")).toHaveValue("180");
    await expect(page.getByLabel("Płeć fizjologiczna")).toHaveValue("male");
    await expect(page.getByLabel("Cel", { exact: true })).toHaveValue("lose_weight");
  });

  test("pokazuje polskie komunikaty walidacji z serwera", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByLabel("Wzrost (cm)").fill("50");
    await page.getByRole("button", { name: "Oblicz" }).click();
    await expect(page.getByTestId("form-error")).toContainText("Popraw zaznaczone pola");
    await expect(page.getByText("Podaj wartość od 120 do 230 cm.")).toBeVisible();
    await expect(page.getByText("To pole jest wymagane.").first()).toBeVisible();
  });

  test("ciąża wyłącza automatyczne wyliczenie celu", async ({ page }) => {
    await page.goto("/onboarding");
    await fillBody(page, { birthDate: "1994-07-01", height: "165", weight: "62" });
    await page.getByLabel("Ciąża").check();
    await page.getByRole("button", { name: "Oblicz" }).click();
    await expect(page.getByTestId("nutrition-restricted")).toContainText("W ciąży");
    await expect(page.getByTestId("nutrition-result")).toHaveCount(0);
  });
});
