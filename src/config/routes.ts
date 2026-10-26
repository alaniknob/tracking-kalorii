/**
 * Jedno źródło prawdy o ekranach aplikacji: ścieżka, etap realizacji i dostępność.
 * Ekrany niedostępne renderują `UnavailableScreen` i są oznaczane w nawigacji —
 * w interfejsie nie ma przycisków prowadzących donikąd.
 */
export type ScreenId =
  | "home"
  | "login"
  | "register"
  | "onboarding"
  | "dashboard"
  | "nutritionSettings"
  | "allergies"
  | "budget"
  | "stores"
  | "generator"
  | "week"
  | "meal"
  | "shopping"
  | "recipes"
  | "products"
  | "profileSettings"
  | "history";

export type ScreenGroup = "start" | "account" | "settings" | "planning" | "catalog";

export interface ScreenDefinition {
  id: ScreenId;
  path: string;
  /** Etap z docs/ROADMAP.md, w którym ekran staje się dostępny. */
  stage: number;
  available: boolean;
  group: ScreenGroup;
  /** Czy pokazywać w głównej nawigacji / na liście ekranów. */
  listed: boolean;
}

export const SCREENS: Record<ScreenId, ScreenDefinition> = {
  home: { id: "home", path: "/", stage: 1, available: true, group: "start", listed: false },
  onboarding: { id: "onboarding", path: "/onboarding", stage: 2, available: true, group: "start", listed: true },
  login: { id: "login", path: "/logowanie", stage: 7, available: false, group: "account", listed: true },
  register: { id: "register", path: "/rejestracja", stage: 7, available: false, group: "account", listed: true },
  dashboard: { id: "dashboard", path: "/panel", stage: 7, available: false, group: "planning", listed: true },
  nutritionSettings: {
    id: "nutritionSettings",
    path: "/ustawienia/zywienie",
    stage: 2,
    available: true,
    group: "settings",
    listed: true,
  },
  allergies: { id: "allergies", path: "/ustawienia/alergie", stage: 2, available: true, group: "settings", listed: true },
  budget: { id: "budget", path: "/ustawienia/budzet", stage: 4, available: false, group: "settings", listed: true },
  stores: { id: "stores", path: "/ustawienia/sklepy", stage: 4, available: false, group: "settings", listed: true },
  generator: { id: "generator", path: "/generator", stage: 5, available: false, group: "planning", listed: true },
  week: { id: "week", path: "/plan", stage: 5, available: false, group: "planning", listed: true },
  meal: { id: "meal", path: "/plan/posilki", stage: 5, available: false, group: "planning", listed: false },
  shopping: { id: "shopping", path: "/zakupy", stage: 6, available: false, group: "planning", listed: true },
  recipes: { id: "recipes", path: "/przepisy", stage: 3, available: true, group: "catalog", listed: true },
  products: { id: "products", path: "/produkty", stage: 3, available: true, group: "catalog", listed: true },
  profileSettings: { id: "profileSettings", path: "/profil", stage: 7, available: false, group: "account", listed: true },
  history: { id: "history", path: "/historia", stage: 7, available: false, group: "planning", listed: true },
};

export const MAIN_NAV = ["onboarding", "nutritionSettings", "allergies", "recipes", "generator"] as const satisfies readonly ScreenId[];

export function listedScreens(): ScreenDefinition[] {
  return Object.values(SCREENS).filter((screen) => screen.listed);
}
