import { expect, type Page } from "@playwright/test";

/** Bez sesji każda ścieżka produktu wraca do rejestracji — z formularzem albo „brak konfiguracji”. */
export async function expectRegisterWall(page: Page) {
  await expect(page).toHaveURL(/\/(rejestracja)?$/);
  await expect(page.getByTestId("register-home")).toBeVisible();
  await expect(page.locator("#ekrany")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Ekrany aplikacji" })).toHaveCount(0);
  await expect(page.getByTestId("brak-konfiguracji").or(page.getByTestId("register-form"))).toBeVisible();
}
