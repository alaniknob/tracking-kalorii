# Plan rozwoju

Małe, weryfikowalne etapy. Każdy etap zamykamy dopiero po: testach jednostkowych i E2E,
typecheck, lint, buildzie produkcyjnym, aktualizacji dokumentacji. Numer etapu ekranu jest
w `src/config/routes.ts` i widoczny w UI.

| # | Etap | Status |
| --- | --- | --- |
| 1 | Fundament | ✅ zrobione |
| 2 | Profil, kalkulator, preferencje, alergie | ✅ zrobione |
| 3 | Produkty, przepisy, alergeny | ✅ zrobione |
| 4 | Budżet, sklepy, ceny, promocje | ✅ zrobione |
| 5 | Generator jadłospisu | ✅ zrobione |
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

**2b — zrobione:** ekran „Ustawienia żywieniowe” (łączone sposoby żywienia, nielubiane i
preferowane produkty, liczba składników, czas, trudność, wyposażenie, resztki), ekran „Alergie
i wykluczenia” (14 alergenów UE: alergia / nietolerancja, ślady, inne alergie, nietolerancje,
dobrowolne wykluczenia), silnik reguł z wykrywaniem konfliktów (`features/preferences`),
moduł `features/allergens` z oceną produktu (`needs_verification` zamiast „bezpieczny”),
walidacja Zod na serwerze, tymczasowe przechowywanie w `sessionStorage`, testy jednostkowe i E2E.

## 3. Produkty, przepisy, alergeny — zrobione

- Modele produktu i przepisu (`features/products`, `features/recipes`), schemat Zod produktu
  (zakresy, suma makro, spójność energii), kompletność danych wyliczana z danych.
- Przeliczanie ilości g/kg/ml/l/szt (masa sztuki, gęstość) i liczba opakowań; błędy zamiast zgadywania.
- Kcal i makro przepisu ze składników surowych; na porcję i na 100 g potrawy (masa po przygotowaniu).
- `assessAllergens` podłączone do przepisów (alergeny przepisu = suma składników) + grupy
  żywności, nielubiane i własne wykluczenia → `evaluateRecipeFit` (wykluczony / wymaga
  weryfikacji / brak wykrytych konfliktów), ocena na serwerze z ustawień z karty.
- Ekrany `/produkty`, `/przepisy`, `/przepisy/[id]` z oznaczonymi danymi demo (18 produktów, 6 przepisów).
- Interfejsy `ProductCatalogProvider` / `RecipeCatalogProvider` (implementacja w pamięci).
- Migracja katalogu z RLS (publiczny odczyt, zapis `service_role`), `seed.sql` generowany
  z kodu i pilnowany testem, testy SQL — sprawdzone na lokalnym PostgreSQL 16.
- Nawigacja mobilna bez przewijania w poziomie (test E2E).

Przeniesione: konflikty preferowanych produktów (wolny tekst) z dietą → etap 5 (zrobione).

## 4. Budżet i sklepy — zrobione

- Konfigurowalna lista sklepów (9 sieci + do 10 własnych), ekran `/ustawienia/sklepy`.
- `StorePriceProvider` / `PromotionProvider` (w pamięci: ceny demo + import użytkownika).
- Import CSV (`/ceny`): parser RFC 4180 (`;` `,` tab, BOM, cudzysłowy), walidacja każdego
  wiersza na serwerze, raport błędów z numerem wiersza i kolumną, szablon `/szablon-cen.csv`.
- Kwoty w groszach; ceny jednostkowe (za 1 kg / 1 l, dodatkowo za sztukę); koszt zużytych
  składników vs koszt koniecznych opakowań; statusy: aktualna, nieaktualna, szacunkowa,
  promocja aktywna / wygasła / nadchodząca / z warunkami, brak ceny.
- Ceny potwierdzone i szacunkowe nigdy niesumowane razem.
- Koszt przepisu na `/przepisy/[id]`; budżet tygodniowy i sprawdzenie koszyka z diagnozą
  (`/ustawienia/budzet`): potrzebny budżet, brakująca kwota, najdroższe pozycje, propozycje.
- Migracja `stores`, `store_prices`, `promotions` z RLS + testy SQL; seed z cenami demo.

Przeniesione: `NutritionDataProvider` → etap 7 (wraz z prawdziwym źródłem danych); zapis cen
z importu w bazie (osobna tabela z `user_id`) → etap 7. Żadnego scrapingu bez zgody źródła.

## 5. Generator jadłospisu — zrobione

- Deterministyczny generator 7 dni (`features/meal-planning`): twarde filtry (alergie, dieta,
  „wymaga weryfikacji”, czas, trudność, sprzęt, liczba składników) → ocena leksykograficzna:
  wymagane grupy → energia ±10% → makro → budżet (całe opakowania, minus zapasy) → dostępność
  cen → koszt, resztki opakowań, czas, różnorodność, preferowane produkty.
- Porcje 0,5–2×, 2–6 posiłków dziennie, resztki na następny dzień, zapasy użytkownika.
- Trzy koszty (zużyte / opakowania / do kupienia), ceny potwierdzone i szacunkowe osobno,
  diagnoza budżetu z potrzebną kwotą, diagnoza niewykonalności po polsku z konkretnymi zmianami.
- Ekrany: `/generator`, `/plan`, `/plan/posilki/[id]`; profil zachowywany w karcie na życzenie.
- Konflikt preferowanych produktów z dietą/alergiami (dopasowanie do katalogu) — przeniesiony
  z etapu 3.
- 7 nowych produktów, 13 nowych przepisów i 15 cen demo (oznaczone).

Przeniesione: zapis planów i zapasów w bazie → etap 7 (z kontami i RLS właściciela); ręczna
zamiana posiłku w planie → etap 6.

## 6. Lista zakupów

Sumowanie, opakowania, grupowanie wg sklepu/kategorii, odhaczanie, posiadane, brakujące ceny,
aktualizacja po zmianie planu; widok mobilny.

## 7. Konta i trwałość

Supabase Auth (e-mail), zapis profilu i planów, historia, usuwanie konta i danych, RLS,
API `src/app/api/v1/*` dla przyszłej aplikacji mobilnej. **Wymaga konfiguracji projektu Supabase.**

## 8. Weryfikacja

Pełne testy, przegląd bezpieczeństwa i RODO (dane szczególnych kategorii), responsywność,
obsługa błędów, dokumentacja uruchomienia, lista gotowe / do zrobienia.
