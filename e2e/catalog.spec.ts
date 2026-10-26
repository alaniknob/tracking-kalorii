import { expect, test } from "@playwright/test";

test.describe("katalog produktów i przepisów", () => {
  test("produkty są oznaczone jako przykładowe, z kompletnością danych", async ({ page }) => {
    await page.goto("/produkty");
    await expect(page.getByTestId("demo-notice")).toContainText("dane przykładowe");
    await expect(page.getByTestId("product-przyprawa-curry")).toContainText("Dane minimalne");
    await expect(page.getByTestId("product-chleb-zytni")).toContainText("Skład nieznany — wymaga weryfikacji");
    await expect(page.getByTestId("product-mleko-2")).toContainText("na 100 ml");
  });

  test("szczegóły przepisu: wartości wyliczone ze składników i ostrzeżenie o brakach", async ({ page }) => {
    await page.goto("/przepisy");
    await expect(page.getByTestId("demo-notice")).toBeVisible();
    await page.getByRole("link", { name: /Kurczak curry/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kurczak curry z papryką i ryżem");
    await expect(page.getByRole("table")).toContainText("Na porcję");
    await expect(page.getByText("Kalorie i makroskładniki są wyliczane ze składników")).toBeVisible();
    await expect(page.getByTestId("incomplete-data")).toContainText("„Przyprawa curry” nie ma danych");
    await expect(page.getByText("Ustaw preferencje i alergie")).toBeVisible();
  });

  test("alergia z ustawień wyklucza przepis, a brak danych o składzie wymaga weryfikacji", async ({ page }) => {
    await page.goto("/ustawienia/alergie");
    await page.getByRole("radiogroup", { name: "Mleko (w tym laktoza)", exact: true }).getByText("Alergia").click();
    await page.getByRole("button", { name: "Sprawdź i zapisz w tej karcie" }).click();
    await expect(page.getByTestId("settings-saved")).toBeVisible();

    await page.goto("/przepisy");
    await expect(page.getByTestId("fit-owsianka-bananowa")).toHaveText("Wykluczony dla Ciebie");
    await expect(page.getByTestId("fit-jajecznica-z-papryka")).toHaveText("Wymaga weryfikacji");
    await expect(page.getByTestId("fit-tofu-z-warzywami")).toHaveText("Brak konfliktu z Twoimi ustawieniami");

    await page.goto("/przepisy/owsianka-bananowa");
    await expect(page.getByTestId("fit-details")).toContainText("Alergen: Mleko (w tym laktoza) (zawiera).");
  });
});

test("nawigacja mieści się na ekranie bez przewijania w poziomie", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(() => {
    const nav = document.querySelector<HTMLElement>("[data-testid=main-nav]")!;
    return {
      page: document.documentElement.scrollWidth - window.innerWidth,
      nav: nav.scrollWidth - nav.clientWidth,
    };
  });
  expect(overflow.page).toBeLessThanOrEqual(0);
  expect(overflow.nav).toBeLessThanOrEqual(0);
  await expect(page.getByTestId("main-nav").getByRole("link", { name: /Przepisy/ })).toBeVisible();
});
