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
  | "prices"
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
  onboarding: { id: "onboarding", path: "/onboarding", stage: 2, available: true, group: "start", listed: false },
  login: { id: "login", path: "/logowanie", stage: 7, available: true, group: "account", listed: false },
  register: { id: "register", path: "/rejestracja", stage: 7, available: true, group: "account", listed: false },
  dashboard: { id: "dashboard", path: "/panel", stage: 7, available: true, group: "planning", listed: false },
  nutritionSettings: {
    id: "nutritionSettings",
    path: "/ustawienia/zywienie",
    stage: 2,
    available: true,
    group: "settings",
    listed: true,
  },
  allergies: { id: "allergies", path: "/ustawienia/alergie", stage: 2, available: true, group: "settings", listed: true },
  budget: { id: "budget", path: "/ustawienia/budzet", stage: 4, available: true, group: "settings", listed: true },
  stores: { id: "stores", path: "/ustawienia/sklepy", stage: 4, available: true, group: "settings", listed: true },
  generator: { id: "generator", path: "/generator", stage: 5, available: true, group: "planning", listed: true },
  week: { id: "week", path: "/plan", stage: 5, available: true, group: "planning", listed: true },
  meal: { id: "meal", path: "/plan/posilki", stage: 5, available: true, group: "planning", listed: false },
  shopping: { id: "shopping", path: "/zakupy", stage: 6, available: true, group: "planning", listed: true },
  recipes: { id: "recipes", path: "/przepisy", stage: 3, available: true, group: "catalog", listed: true },
  products: { id: "products", path: "/produkty", stage: 3, available: true, group: "catalog", listed: true },
  prices: { id: "prices", path: "/ceny", stage: 4, available: true, group: "catalog", listed: true },
  profileSettings: { id: "profileSettings", path: "/profil", stage: 7, available: true, group: "account", listed: true },
  history: { id: "history", path: "/historia", stage: 7, available: true, group: "planning", listed: true },
};

/** Plan / generator / zakupy — produkt po kreatorze, nie mapa ekranów deweloperskich. */
export const MAIN_NAV = ["week", "generator", "shopping"] as const satisfies readonly ScreenId[];

const PROTECTED_PREFIXES = [
  "/onboarding",
  "/panel",
  "/ustawienia",
  "/generator",
  "/plan",
  "/zakupy",
  "/przepisy",
  "/produkty",
  "/ceny",
  "/profil",
  "/historia",
] as const;

export function isProtectedAppPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isWizardPath(pathname: string): boolean {
  return pathname === "/onboarding" || pathname.startsWith("/onboarding/");
}

/** Konto (wylogowanie, usunięcie) działa w trakcie kreatora. */
export function allowsIncompleteProfile(pathname: string): boolean {
  return isWizardPath(pathname) || pathname === "/profil" || pathname.startsWith("/profil/");
}

