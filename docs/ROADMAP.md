# Plan rozwoju

Małe, weryfikowalne etapy. Każdy etap zamykamy dopiero po: testach jednostkowych i E2E,
typecheck, lint, buildzie produkcyjnym, aktualizacji dokumentacji. Numer etapu ekranu jest
w `src/config/routes.ts` i widoczny w UI.

| # | Etap | Status |
| --- | --- | --- |
| 1 | Fundament | ✅ zrobione |
| 2 | Profil i kalkulator | 🟡 częściowo (2a zrobione, 2b do zrobienia) |
| 3 | Produkty, przepisy, alergeny | ⏳ |
| 4 | Budżet, sklepy, ceny, promocje | ⏳ |
| 5 | Generator jadłospisu | ⏳ |
| 6 | Lista zakupów | ⏳ |
| 7 | Konta i trwałość (Supabase) | ⏳ |
| 8 | Weryfikacja końcowa | ⏳ |

## 1. Fundament — zrobione

- Next.js 15 App Router, TypeScript strict, Tailwind 4, tokeny w `globals.css`.
- Lokalne komponenty UI, układ (nagłówek, stopka, kontener), strony błędów po polsku.
- Rejestr ekranów + szkielet wszystkich tras z briefu; niedostępne wyraźnie oznaczone.
- Struktura `src/features/*`, i18n (`pl-PL`), formatowanie Intl.
- ESLint, Vitest, Playwright (desktop + mobile), `.env.example`, `supabase/migrations/`.

## 2. Profil i kalkulator

**2a — zrobione:** formularz `/onboarding`, walidacja Zod na serwerze, BMR (Mifflin–St Jeor),
TDEE, cel kaloryczny z limitami, makro, zasady bezpieczeństwa (niepełnoletni, ciąża, karmienie,
choroby, niedowaga), testy jednostkowe i E2E.

**2b — do zrobienia:** ekran „Ustawienia żywieniowe” (sposób żywienia jako łączone reguły,
nielubiane produkty, liczba składników, czas, trudność, wyposażenie, resztki), silnik reguł
preferencji z wykrywaniem konfliktów (`features/preferences`) + testy; formularz alergii /
nietolerancji / wykluczeń (wymaga słownika alergenów z etapu 3 — można przenieść).

## 3. Produkty, przepisy, alergeny

Moduł `allergens` (14 alergenów UE, statusy `zawiera / może zawierać / wymaga weryfikacji`),
modele produktów i wartości odżywczych, receptury ze składnikami, przeliczanie gramatur
(g/ml/szt, surowe vs po przygotowaniu), kcal i makro liczone ze składników, dane demo oznaczone
`is_demo`. Pierwsze migracje katalogu + RLS publicznego odczytu.

## 4. Budżet i sklepy

Interfejsy `ProductCatalogProvider`, `StorePriceProvider`, `PromotionProvider`,
`NutritionDataProvider`; import CSV cen; ceny jednostkowe; statusy aktualności (aktualna,
przestarzała, wygasła promocja, brak ceny, szacunkowa); ekrany budżetu i wyboru sklepów.
Żadnego scrapingu bez zgody źródła.

## 5. Generator jadłospisu

Deterministyczna selekcja: twarde ograniczenia (bezpieczeństwo, alergie, dieta) → energia →
makro → budżet → dostępność → czas → różnorodność → mniej marnowania. Optymalizacja kosztu
z uwzględnieniem całych opakowań i zapasów. Diagnoza nierealnego budżetu z kwotą potrzebną.
Widok tygodnia i szczegóły posiłku.

## 6. Lista zakupów

Sumowanie, opakowania, grupowanie wg sklepu/kategorii, odhaczanie, posiadane, brakujące ceny,
aktualizacja po zmianie planu; widok mobilny.

## 7. Konta i trwałość

Supabase Auth (e-mail), zapis profilu i planów, historia, usuwanie konta i danych, RLS,
API `src/app/api/v1/*` dla przyszłej aplikacji mobilnej. **Wymaga konfiguracji projektu Supabase.**

## 8. Weryfikacja

Pełne testy, przegląd bezpieczeństwa i RODO (dane szczególnych kategorii), responsywność,
obsługa błędów, dokumentacja uruchomienia, lista gotowe / do zrobienia.
