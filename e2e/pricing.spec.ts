import { expect, test, type Page } from "@playwright/test";

/** Wczoraj (UTC) — data ceny w imporcie nigdy nie jest „z przyszłości” dla strefy Europe/Warsaw. */
const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

async function uploadCsv(page: Page, name: string, content: string) {
  await page.getByLabel(/Plik CSV/).setInputFiles({ name, mimeType: "text/csv", buffer: Buffer.from(content, "utf8") });
  await page.getByRole("button", { name: "Importuj" }).click();
}

test.describe("ceny, sklepy i budżet", () => {
  test("ceny demo: oznaczenie, cena jednostkowa, brak ceny, szacunki i promocje", async ({ page }) => {
    await page.goto("/ceny");
    await expect(page.getByTestId("demo-notice")).toContainText("PRZYKŁADOWE");
    const rice = page.getByTestId("prices-ryz-bialy");
    await expect(rice).toContainText("2,79 zł");
    await expect(rice).toContainText("6,98 zł/kg");
    await expect(page.getByTestId("prices-przyprawa-curry")).toContainText("Brak ceny w żadnym sklepie");
    await expect(page.getByTestId("prices-chleb-zytni")).toContainText("Szacunkowa");
    await expect(page.getByTestId("promo-notes-mleko-2")).toContainText("Promocja wygasła");
    await expect(page.getByTestId("promo-notes-tofu-naturalne")).toContainText("nie jest liczona automatycznie");
    await expect(page.getByTestId("prices-jaja")).toContainText("/szt.");
  });

  test("import CSV: poprawne wiersze są przyjmowane, błędne raportowane z linią i kolumną", async ({ page }) => {
    await page.goto("/ceny");
    await expect(page.getByTestId("price-table")).toBeVisible();
    await uploadCsv(
      page,
      "moje-ceny.csv",
      [
        "produkt;sklep;cena;opakowanie;jednostka;data;zrodlo",
        `przyprawa-curry;Lidl;3,19;20;g;${yesterday};paragon`,
        `ryz-bialy;Lidl;4,999;1;kg;${yesterday};paragon`,
        `Ryż biały;Żabka;3,99;1;kg;${yesterday};paragon`,
        `ryz-bialy;Netto;4,59;1;kg;${yesterday};gazetka`,
      ].join("\n"),
    );
    const report = page.getByTestId("import-report");
    await expect(report).toContainText("Wierszy: 4. Przyjęto cen: 2, promocji: 0. Odrzucono wierszy: 2.");
    const errors = page.getByTestId("import-errors");
    await expect(errors.getByRole("row", { name: /^3 cena/ })).toContainText("Niepoprawna cena");
    await expect(errors.getByRole("row", { name: /^4 sklep/ })).toContainText("Nieznany sklep „Żabka”");
    await expect(page.getByTestId("active-import")).toContainText("moje-ceny.csv");

    await page.reload();
    await expect(page.getByTestId("prices-przyprawa-curry")).toContainText("Twój import CSV");
    await expect(page.getByTestId("prices-przyprawa-curry")).toContainText("3,19 zł");

    await page.goto("/przepisy/kurczak-curry-z-ryzem");
    await expect(page.getByTestId("recipe-cost")).toContainText("Uwzględniono Twój import: moje-ceny.csv");
    await expect(page.getByTestId("cost-przyprawa-curry")).toContainText("3,19 zł");
  });

  test("import CSV: błąd pliku (brak wymaganych kolumn)", async ({ page }) => {
    await page.goto("/ceny");
    await uploadCsv(page, "zly.csv", "produkt;cena\nryz-bialy;4,99");
    await expect(page.getByTestId("import-file-error")).toContainText("Brak wymaganych kolumn: sklep");
  });

  test("koszt przepisu: zużyte vs opakowania, brak ceny, dane przykładowe", async ({ page }) => {
    await page.goto("/przepisy/kurczak-curry-z-ryzem");
    const cost = page.getByTestId("recipe-cost");
    await expect(cost).toContainText("Ceny przykładowe");
    await expect(cost).toContainText("Sklepy: wszystkie z listy");
    await expect(page.getByTestId("cost-przyprawa-curry")).toContainText("Brak ceny w wybranych sklepach");
    await expect(page.getByTestId("cost-totals")).toContainText("Koszt koniecznych opakowań");
    await expect(page.getByTestId("cost-per-serving")).toBeVisible();
  });

  test("wybór sklepów: walidacja i zapis z własnym sklepem", async ({ page }) => {
    await page.goto("/ustawienia/sklepy");
    await page.getByRole("button", { name: "Zapisz sklepy" }).click();
    await expect(page.getByTestId("form-error")).toBeVisible();
    await expect(page.getByText("Wybierz co najmniej jeden sklep")).toBeVisible();

    await page.getByLabel("Biedronka").check();
    await page.getByLabel(/Inne sklepy/).fill("Targ na Kleparzu");
    await page.getByRole("button", { name: "Zapisz sklepy" }).click();
    await expect(page.getByTestId("stores-saved")).toBeVisible();
    await expect(page.getByTestId("selected-stores")).toContainText("Biedronka");
    await expect(page.getByTestId("selected-stores")).toContainText("Targ na Kleparzu (własny)");

    await page.goto("/przepisy/owsianka-bananowa");
    await expect(page.getByTestId("recipe-cost")).toContainText("Sklepy: Biedronka, Targ na Kleparzu");
  });

  test("budżet: walidacja, za niski budżet z diagnozą, wystarczający budżet", async ({ page }) => {
    await page.goto("/ustawienia/budzet");
    await expect(page.getByTestId("basket-no-budget")).toBeVisible();
    await page.getByLabel("Tygodniowy budżet na żywność").fill("abc");
    await page.getByRole("button", { name: "Zapisz budżet" }).click();
    await expect(page.getByText("Podaj kwotę w złotych")).toBeVisible();

    await page.getByLabel("Tygodniowy budżet na żywność").fill("20");
    await page.getByRole("button", { name: "Zapisz budżet" }).click();
    await expect(page.getByTestId("budget-saved")).toContainText("20,00 zł");

    await page.getByRole("button", { name: "Sprawdź koszt" }).click();
    await expect(page.getByTestId("basket-error")).toContainText("Wybierz co najmniej jeden przepis");

    await page.getByLabel("Liczba przygotowań: Pieczony łosoś z ryżem i papryką").fill("3");
    await page.getByLabel("Liczba przygotowań: Owsianka bananowa z masłem orzechowym").fill("2");
    await page.getByRole("button", { name: "Sprawdź koszt" }).click();
    const diagnosis = page.getByTestId("budget-diagnosis");
    await expect(diagnosis).toHaveAttribute("data-status", "over");
    await expect(diagnosis).toContainText("Budżet jest za niski");
    await expect(page.getByTestId("shortfall")).toBeVisible();
    await expect(page.getByTestId("budget-suggestions")).toContainText("Wybierz tańsze przepisy");

    await page.getByLabel("Tygodniowy budżet na żywność").fill("500");
    await page.getByRole("button", { name: "Zapisz budżet" }).click();
    await expect(page.getByTestId("budget-saved")).toContainText("500,00 zł");
    await page.getByLabel("Liczba przygotowań: Pieczony łosoś z ryżem i papryką").fill("0");
    await page.getByLabel("Liczba przygotowań: Owsianka bananowa z masłem orzechowym").fill("2");
    await page.getByRole("button", { name: "Sprawdź koszt" }).click();
    await expect(page.getByTestId("budget-diagnosis")).toHaveAttribute("data-status", /^within/);
  });
});
