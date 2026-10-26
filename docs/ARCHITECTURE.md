# Architektura

## Stos

| Warstwa | Technologia | Wersja (package.json) |
| --- | --- | --- |
| Framework | Next.js (App Router, React Server Components, Server Actions) | 15.5 |
| UI | React | 19.1 |
| Język | TypeScript, `strict: true` | 5.x |
| Style | Tailwind CSS (tokeny w `@theme`) | 4.x |
| Walidacja | Zod | 4.x |
| Testy jednostkowe | Vitest | 5.x |
| Testy E2E | Playwright (Chromium desktop + mobile) | 1.x |
| Baza / Auth (planowane, etap 7) | Supabase (PostgreSQL + Auth + RLS) | — |

Biblioteka komponentów: własne, lokalne komponenty w `src/components/ui` (podejście
w stylu shadcn/ui — kod w repo, pełna kontrola, bez zależności runtime poza `clsx` i
`tailwind-merge`). Zob. `docs/DECISIONS.md`.

## Struktura katalogów

```
src/
  app/                    # tylko routing i kompozycja ekranów (cienkie strony)
    layout.tsx            # lang="pl", nagłówek, stopka, link „Przejdź do treści”
    page.tsx              # strona główna
    onboarding/           # profil + kalkulator (etap 2)
    …                     # pozostałe ekrany → UnavailableScreen
    error.tsx, not-found.tsx
  components/
    ui/                   # prymitywy: Button/ButtonLink, Card, Badge, Alert, Field/Input/Select/Checkbox
    layout/               # Container, SiteHeader, SiteFooter, PageHeader, UnavailableScreen
  config/routes.ts        # rejestr ekranów: ścieżka, etap, dostępność, grupa
  features/
    nutrition/            # CZYSTA logika: BMR, TDEE, cel kcal, makro, zasady bezpieczeństwa
    profile/              # schemat Zod, evaluateProfile, akcja serwera, komponenty formularza
    allergens/            # CZYSTA logika: 14 alergenów UE, rodzaje wykluczeń, assessAllergens()
    preferences/          # reguły diet (diet-styles.ts), resolveFoodRules(), schematy Zod,
                          # evaluateDietSettings / evaluateRestrictions, akcje, formularze
    products/             # typy, Zod, przeliczanie ilości (quantity.ts), kompletność danych,
                          # dane demo, ProductCatalogProvider, generator seed.sql
    recipes/              # calculateRecipeNutrition, evaluateRecipeFit, dane demo, katalog,
                          # akcja oceny zgodności, komponenty (tabela wartości, plakietki)
    pricing/ promotions/
    meal-planning/ shopping/ auth/   # planowane moduły (README z zakresem)
  i18n/
    config.ts             # obsługiwane locale (pl-PL)
    messages/pl.ts        # wszystkie teksty UI i komunikaty walidacji
    format.ts             # Intl: liczby, kcal, g, %, PLN, daty
  lib/cn.ts               # łączenie klas Tailwind
e2e/                      # testy Playwright
supabase/
  migrations/             # wersjonowane migracje SQL (od etapu 3)
  seed.sql                # generowany z danych demo w TS
  tests/                  # testy SQL (ograniczenia, RLS)
```

## Zasady warstw

1. **Logika domenowa** (`features/*/` bez `components/`) to czysty TypeScript — bez React,
   Next.js i dostępu do sieci. Może być wywołana z akcji serwera, przyszłego API dla aplikacji
   mobilnej, skryptów i testów. Przykład: `calculateNutritionTargets()`.
2. **Walidacja** (Zod) jest w module funkcji (`features/profile/schema.ts`) i wykonywana
   **na serwerze**. Formularz używa `noValidate` — źródłem prawdy jest serwer.
3. **Przypadki użycia** (`features/profile/calculate.ts → evaluateProfile`) łączą walidację
   i obliczenia, zwracając serializowalny stan (`idle | invalid | success`).
4. **Akcje serwera** (`features/profile/actions.ts`) są cienkimi adapterami FormData → przypadek użycia.
5. **Komponenty** (`features/*/components`, `components/`) tylko renderują stan; nie liczą kcal.
6. **Teksty** wyłącznie z `getMessages()`; formatowanie wyłącznie przez `i18n/format.ts`.
7. **Tokeny** (kolory, promienie, cienie, font) wyłącznie w `src/app/globals.css` (`@theme`).
   Kolor główny: granat `--color-primary: #0f2a4f`.

## Przepływ: kalkulator

```
<ProfileForm> (client, useActionState)
   └─ submit FormData → calculateProfileAction (server action)
        └─ readProfileFormData → evaluateProfile
             ├─ createProfileSchema().safeParse   (Zod, komunikaty PL)
             ├─ toNutritionInput                   (wiek z daty urodzenia)
             └─ calculateNutritionTargets          (features/nutrition)
                  ├─ getRestrictionReasons → { kind: "restricted" }
                  ├─ getGoalBlockReason    → { kind: "goal_blocked" }
                  └─ BMR → TDEE → calculateGoalCalories → calculateMacros → { kind: "ok" }
```

## Przepływ: preferencje i alergie

```
<DietSettingsForm> / <RestrictionsForm> (client)
   ├─ useSettingsForm: useActionState + wersja robocza własna (wypełnia pola)
   │                    + wersja robocza drugiego ekranu (hidden input)
   └─ saveDietSettingsAction / saveRestrictionsAction (server action)
        └─ evaluateDietSettings / evaluateRestrictions
             ├─ dietSettingsSchema / restrictionsSchema   (Zod, komunikaty PL)
             ├─ parseDraft(drugi ekran)                     (ta sama walidacja; błędna → pominięta)
             └─ resolveFoodRules                            → status success | conflict
   └─ po success: zapis surowych wartości do sessionStorage (tylko ta karta)
```

## Przepływ: katalog i ocena przepisów

```
catalog = createInMemoryCatalog(DEMO_PRODUCTS, DEMO_RECIPES, isDemo)   (features/recipes/catalog.ts)
   │      implementuje ProductCatalogProvider / RecipeCatalogProvider
   │      (etap 7: implementacja na Supabase o tym samym interfejsie)
   ├─ /produkty, /przepisy, /przepisy/[id]   (Server Components, statyczne)
   │     └─ calculateRecipeNutrition(recipe, products)
   │          └─ toGrams (g/kg/ml/l/szt; masa sztuki, gęstość) → suma surowa
   │             → na porcję, na 100 g potrawy (cooked_yield_g) + lista braków
   └─ <RecipeFitProvider> (client) — czyta wersje robocze ustawień z sessionStorage
        └─ evaluateRecipeFitAction(ids, dietDraft, restrictionsDraft) (server action)
             ├─ resolveRulesFromDrafts → parseDraft (Zod) → resolveFoodRules
             └─ evaluateRecipeFit: aggregateRecipeAllergens → assessAllergens,
                recipeFoodGroups × forbiddenGroups, własne wykluczenia
                → excluded | needs_verification | no_conflict_found
```

Strony z danymi są statyczne (bez danych użytkownika); ocena zgodności jest jedynym
dynamicznym elementem i liczy się wyłącznie na serwerze. Dane demo trafiają do bazy przez
`buildDemoSeedSql()` → `supabase/seed.sql` (test pilnuje, że plik jest aktualny).

## Ekrany i nawigacja

Rejestr `src/config/routes.ts` jest jedynym źródłem informacji, czy ekran jest dostępny.
Nawigacja i strona główna oznaczają niedostępne ekrany („Wkrótce”, „Niedostępne · Etap N”),
a ich trasy renderują `UnavailableScreen` z opisem i numerem etapu. Test E2E sprawdza, że
każdy link z listy ekranów zwraca HTTP 200. Główna nawigacja (`MAIN_NAV`, 5 pozycji) na
telefonie jest osobnym wierszem-siatką pod logo (bez przewijania w poziomie — test E2E).

## i18n

Teksty w obiekcie `pl` (`Messages` = jego typ). Dodanie języka: nowy plik o tym samym kształcie
w `i18n/messages/`, wpis w `SUPPORTED_LOCALES` i słowniku `getMessages`. Routing z prefiksem
locale nie jest wprowadzony (jeden język) — decyzja w `DECISIONS.md`.

## Przyszłe API dla aplikacji mobilnej (planowane)

Ta sama logika (`evaluateProfile`, przyszłe `generateMealPlan`) zostanie wystawiona przez
Route Handlers `src/app/api/v1/*` (JSON, uwierzytelnianie tokenem Supabase). Akcje serwera
pozostaną adapterem dla przeglądarki. Bez mikroserwisów.

## Bezpieczeństwo i prywatność

- Brak kluczy administracyjnych w przeglądarce: `SUPABASE_SERVICE_ROLE_KEY` tylko po stronie
  serwera (obecnie nieużywany). Zob. `.env.example`.
- Dane zdrowotne nie są zapisywane ani logowane w etapach 1–3.
- Katalog w bazie: RLS włączone, odczyt publiczny, zapis tylko `service_role` (migracja etapu 3).
- Planowane: RLS dla wszystkich tabel użytkownika, usuwanie konta i danych, logi bez danych
  zdrowotnych, ocena RODO (dane szczególnych kategorii) przed publicznym startem.

## Komendy

| Komenda | Opis |
| --- | --- |
| `npm run dev` | serwer deweloperski |
| `npm run build` / `npm start` | build produkcyjny / uruchomienie |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (next/core-web-vitals + typescript) |
| `npm test` | Vitest (testy jednostkowe) |
| `npm run test:e2e` | Playwright (wymaga wcześniejszego `npm run build`) |
| `npm run check` | typecheck + lint + test + build |
| `npm run db:seed:generate` | regeneruje `supabase/seed.sql` z danych demo |
