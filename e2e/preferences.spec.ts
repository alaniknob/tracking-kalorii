import { expect, test } from "@playwright/test";

test.describe("preferencje i alergie", () => {
  test("sprzeczne sposoby żywienia blokują zapis i podpowiadają rozwiązanie", async ({ page }) => {
    await page.goto("/ustawienia/zywienie");
    await page.getByLabel("Tradycyjna").uncheck();
    await page.getByLabel("Wegetariańska").check();
    await page.getByLabel("Z rybami").check();
    await page.getByRole("button", { name: "Sprawdź i zapisz w tej karcie" }).click();

    await expect(page.getByTestId("settings-conflict")).toBeVisible();
    await expect(page.getByTestId("conflicts-blocking")).toContainText("„Bezmięsna” + „Z rybami”");
    await expect(page.getByTestId("settings-saved")).toHaveCount(0);
  });

  test("walidacja serwerowa list produktów", async ({ page }) => {
    await page.goto("/ustawienia/zywienie");
    await page.getByLabel("Nielubiane produkty").fill("a, brokuły");
    await page.getByRole("button", { name: "Sprawdź i zapisz w tej karcie" }).click();
    await expect(page.getByTestId("form-error")).toBeVisible();
    await expect(page.getByText("Każda pozycja musi mieć od 2 do 60 znaków.")).toBeVisible();
  });

  test("alergia z drugiego ekranu wygrywa z wymaganiem diety", async ({ page }) => {
    await page.goto("/ustawienia/alergie");
    await page.getByRole("radiogroup", { name: "Ryby", exact: true }).getByText("Alergia").click();
    await page.getByLabel("Inne nietolerancje").fill("fruktoza");
    await page.getByRole("button", { name: "Sprawdź i zapisz w tej karcie" }).click();
    const summary = page.getByTestId("rules-summary");
    await expect(page.getByTestId("settings-saved")).toBeVisible();
    await expect(summary).toContainText("Ryby · alergia, także „może zawierać”");
    await expect(summary).toContainText("fruktoza · nietolerancja");

    await page.goto("/ustawienia/zywienie");
    await page.getByLabel("Z rybami").check();
    await page.getByRole("button", { name: "Sprawdź i zapisz w tej karcie" }).click();
    await expect(page.getByTestId("settings-saved")).toBeVisible();
    await expect(summary).toContainText("Uwzględniono też Twoje ustawienia z ekranu „Alergie i wykluczenia”");
    await expect(page.getByTestId("conflicts-resolved")).toContainText("Alergia („Ryby”) wyklucza grupę „ryby”");

    await page.goto("/ustawienia/alergie");
    await expect(page.getByRole("radio", { name: "Ryby: Alergia" })).toBeChecked();
    await page.getByRole("button", { name: "Wyczyść ustawienia z tej karty" }).click();
    await expect(page.getByRole("radio", { name: "Ryby: Nie dotyczy" })).toBeChecked();
  });
});
