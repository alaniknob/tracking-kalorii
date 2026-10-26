# Specyfikacja produktu

> Dokument opisuje **faktyczny stan** implementacji i docelowy zakres. Sekcje oznaczone
> „planowane” nie są jeszcze zaimplementowane. Aktualizowany przy zamknięciu każdego etapu.

## Cel

Aplikacja webowa dla rynku polskiego do:

- szacowania zapotrzebowania energetycznego i makroskładników,
- planowania żywienia zgodnie z celem (redukcja, utrzymanie, zwiększanie masy, budowa mięśni),
- generowania 7-dniowych jadłospisów z uwzględnieniem preferencji, alergii i wykluczeń,
- tworzenia listy zakupów w wybranych sklepach (Lidl, Biedronka, Kaufland, Aldi, Carrefour,
  Auchan i inne — lista konfigurowalna) w ramach tygodniowego budżetu,
- wielokrotnego wykorzystania produktów (mniej marnowania, całe opakowania).

Interfejs w całości po polsku (komunikaty, daty, kwoty w PLN), architektura gotowa na i18n.
Aplikacja nie jest wyrobem medycznym — wyniki są szacunkiem.

## Stan na etap 2 (bieżący)

### Działa

| Funkcja | Ścieżka | Uwagi |
| --- | --- | --- |
| Strona główna z listą ekranów i ich statusem | `/` | Status z `src/config/routes.ts` |
| Profil i kalkulator zapotrzebowania | `/onboarding` | Walidacja na serwerze, brak zapisu danych |
| Ekrany zastępcze (oznaczone „Niedostępne · Etap N”) | pozostałe | Brak martwych przycisków |
| Strony błędów po polsku | 404, błąd | Bez stack trace'ów |

### Kalkulator (etap 2)

Wejście: data urodzenia, wzrost, masa, opcjonalnie masa docelowa, opcjonalnie płeć
fizjologiczna, poziom aktywności, cel, liczba posiłków, opcjonalne flagi zdrowotne.

Wynik rozróżnia cztery wartości:

1. **BMR** — podstawowa przemiana materii (Mifflin–St Jeor),
2. **TDEE** — całkowite zapotrzebowanie = BMR × współczynnik aktywności,
3. **proponowana kaloryczność** — TDEE skorygowane o cel, z limitami bezpieczeństwa,
4. **kalorie zaplanowanych posiłków** — „Brak planu” do czasu generatora (etap 5).

Dodatkowo: BMI, białko / tłuszcze / węglowodany (g i % energii), minimalny błonnik, średnia
kaloryczność posiłku. Współczynniki: `src/features/nutrition/constants.ts`, uzasadnienia:
`docs/DECISIONS.md`.

### Zasady bezpieczeństwa (zaimplementowane)

- Osoby niepełnoletnie, ciąża, karmienie piersią, zaburzenia odżywiania, cukrzyca, choroby
  nerek, układu krążenia lub inne choroby wymagające diety → **brak automatycznych liczb**,
  wyłącznie komunikat z zaleceniem konsultacji.
- Redukcja przy BMI < 18,5 lub do masy docelowej z BMI < 18,5 → cel blokowany (pokazujemy
  BMR/TDEE, bez deficytu).
- Deficyt maks. 15% TDEE i nie więcej niż 500 kcal/d; nigdy poniżej 1200 kcal (kobiety)
  / 1500 kcal (mężczyźni, płeć nieokreślona) ani poniżej BMR. Gdy minimum ≥ TDEE — brak deficytu.
- Walidacja zakresów wejścia: wiek 10–100 lat, wzrost 120–230 cm, masa 35–300 kg, 2–6 posiłków;
  spójność masy docelowej z celem; nieznane wartości opcji są odrzucane.
- Dane nie są zapisywane ani logowane.

### Ograniczenia obecnej wersji

- Brak kont i zapisu profilu (wymaga Supabase — etap 7).
- Preferencje żywieniowe, alergie, budżet i sklepy — ekrany oznaczone jako niedostępne.
- Brak katalogu produktów, przepisów, cen, generatora i listy zakupów.

## Zakres docelowy (planowany)

- **Profil**: pełny zakres z briefu (sposób żywienia, czas przygotowania, budżet, sklepy, alergie
  vs nietolerancje vs preferencje vs dobrowolne wykluczenia, wyposażenie kuchni), edycja.
- **Preferencje**: łączone reguły (np. wegańska ⇒ bez mięsa, ryb, jaj, nabiału), wykrywanie
  konfliktów; alergie i przeciwwskazania mają pierwszeństwo przed smakiem i ceną.
- **Alergeny**: 14 alergenów UE (rozp. 1169/2011) + własne; brak danych o składzie = „wymaga
  weryfikacji”, nigdy „bezpieczny”.
- **Produkty i przepisy**: wartości na 100 g/ml, kompletność danych, źródło; kcal i makro
  przepisów liczone ze składników; masa surowa vs po przygotowaniu.
- **Ceny i promocje**: wiele źródeł przez wspólne interfejsy, import CSV, ceny jednostkowe,
  status aktualności, rozróżnienie cen potwierdzonych i szacunkowych, dane demo oznaczone.
- **Generator**: 7 dni, priorytety (1 bezpieczeństwo, 2 alergie/wykluczenia, 3 dieta, 4 energia,
  5 makro, 6 budżet, 7 dostępność, 8 czas, 9 różnorodność, 10 mniej marnowania), koszt zużytych
  składników vs koszt opakowań vs koszt koszyka, zapasy użytkownika, diagnoza nierealnego budżetu.
- **Lista zakupów**: sumowanie, opakowania, grupowanie wg sklepu i kategorii, odhaczanie, wygodna
  na telefonie.
- **Konta**: Supabase Auth, RLS, usuwanie konta i danych, historia planów.
- **AI** (opcjonalnie, później): tylko warstwa pomocnicza; liczby i twarde ograniczenia liczy kod.
