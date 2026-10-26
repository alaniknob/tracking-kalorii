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

## Stan na koniec etapu 3 (bieżący)

### Działa

| Funkcja | Ścieżka | Uwagi |
| --- | --- | --- |
| Strona główna z listą ekranów i ich statusem | `/` | Status z `src/config/routes.ts` |
| Profil i kalkulator zapotrzebowania | `/onboarding` | Walidacja na serwerze, brak zapisu danych |
| Ustawienia żywieniowe | `/ustawienia/zywienie` | Łączone sposoby żywienia, produkty, gotowanie; wykrywanie konfliktów |
| Alergie i wykluczenia | `/ustawienia/alergie` | 14 alergenów UE (alergia / nietolerancja), ślady, własne wykluczenia |
| Przepisy (lista + szczegóły) | `/przepisy`, `/przepisy/[id]` | Dane demo; kcal i makro ze składników; ocena zgodności z ustawieniami |
| Produkty | `/produkty` | Dane demo; wartości na 100 g/ml, alergeny, kompletność, źródło |
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

### Preferencje, alergie i wykluczenia (etap 2b)

**Ustawienia żywieniowe:** sposoby żywienia (tradycyjna, wegetariańska, wegańska, bezmięsna,
z rybami, bez ryb, z mięsem — można łączyć), nielubiane i preferowane produkty, maks. czas
przygotowania (15–90 min lub bez limitu), trudność, maks. liczba składników (3–20, opcjonalnie),
wyposażenie kuchni, wykorzystywanie resztek. Liczba posiłków jest w profilu (`/onboarding`).

**Alergie i wykluczenia:** dla każdego z 14 alergenów UE (rozp. 1169/2011): nie dotyczy /
alergia / nietolerancja; opcja wykluczania „może zawierać” przy alergiach (domyślnie włączona);
inne alergie, inne nietolerancje i dobrowolne wykluczenia jako osobne listy. Cztery rodzaje
ograniczeń są rozróżniane w modelu: `allergy`, `intolerance`, `voluntary`, `dislike`.

**Silnik reguł** (`src/features/preferences/rules.ts`) łączy oba ekrany w jeden zestaw reguł:
wykluczone grupy żywności, grupy wymagane w planie, wykluczone alergeny, własne wykluczenia,
preferowane produkty. Kolejność ważności: alergie i nietolerancje > sposób żywienia > smak i cena.

| Sytuacja | Wynik |
| --- | --- |
| Sprzeczne sposoby żywienia (np. wegańska + z rybami, bez ryb + z rybami) | **blokada** — ustawienia nie są przyjmowane; przy wegetariańskiej + z rybami podpowiedź „Bezmięsna + Z rybami” |
| Ten sam produkt preferowany i nielubiany | **blokada** |
| Alergia/nietolerancja wyklucza grupę wymaganą przez dietę (np. alergia na ryby + z rybami) | rozstrzygnięte automatycznie — wykluczenie wygrywa, komunikat |
| Preferowany produkt na liście alergii / nietolerancji / wykluczeń | rozstrzygnięte — usunięty z preferowanych, komunikat |

Alergeny mleka, jaj, ryb, skorupiaków i mięczaków wykluczają odpowiednie grupy żywności;
pozostałe (np. gluten, seler) są przekazywane jako wykluczenia alergenów do oceny produktów.

**Ocena alergenów produktu** (`src/features/allergens/assess.ts`, gotowa na etap 3): wynik
`excluded` / `needs_verification` / `no_declared_conflict` — nigdy „bezpieczny”. Brak danych
o składzie przy jakimkolwiek wykluczeniu alergenu → „wymaga weryfikacji”; „może zawierać” przy
alergii z wykluczaniem śladów → wykluczony, przy nietolerancji → „wymaga weryfikacji”.

**Przechowywanie (tymczasowe):** do czasu kont ustawienia trafiają tylko do `sessionStorage`
bieżącej karty (znikają po jej zamknięciu, przycisk „Wyczyść”). Przy zapisie jednego ekranu
przeglądarka dołącza wersję roboczą drugiego, a serwer waliduje ją od nowa — dzięki temu
konflikty między ekranami są wykrywane. Zmanipulowana wersja robocza jest pomijana.

### Produkty i przepisy (etap 3)

**Dane przykładowe.** Katalog zawiera wyłącznie **18 produktów ogólnych i 6 przepisów demo**
(`src/features/products/demo-products.ts`, `src/features/recipes/demo-recipes.ts`). Wartości to
przybliżone typowe wartości dla produktów generycznych, bez marek i bez cen; każdy rekord ma
źródło „Dane przykładowe (demo)” i `is_demo = true`, a ekrany pokazują plakietkę
„Dane przykładowe” i baner z wyjaśnieniem. Przepisy mają wiarygodność „niezweryfikowany”.

**Produkt:** nazwa, kategoria, jednostka bazowa (g lub ml), opcjonalnie wielkość opakowania,
masa sztuki, gęstość (g/ml), wartości na 100 g/ml (kcal, białko, tłuszcz, węglowodany, błonnik
opcjonalnie), skład, zadeklarowane alergeny („zawiera” / „może zawierać”), grupy żywności
(do reguł diet), źródło. **Kompletność danych:** pełne / częściowe (np. brak błonnika lub
składu) / minimalne (brak wartości odżywczych). Spójność energii sprawdzana współczynnikami
Atwatera (±15%).

**Przepis:** składniki w ilościach **surowych** (g, kg, ml, l, szt), porcje, czas, trudność,
wyposażenie, typ posiłku, opcjonalna masa po przygotowaniu. Kcal, makro i alergeny są
**zawsze liczone ze składników** (`calculateRecipeNutrition`): suma, na porcję i — tylko gdy
znana jest masa gotowej potrawy — na 100 g potrawy. Brak wartości odżywczych składnika, masy
sztuki lub gęstości → ostrzeżenie „dane niepełne” z listą przyczyn, bez zgadywania.

**Ocena zgodności przepisu** z ustawieniami z karty (`evaluateRecipeFit`, liczona na serwerze):

| Wynik | Kiedy |
| --- | --- |
| **Wykluczony** | alergen zadeklarowany w składniku (lub „może zawierać” przy alergii z wykluczaniem śladów), grupa żywności wykluczona dietą, nielubiany / wykluczony produkt, własna alergia znaleziona w nazwie lub składzie |
| **Wymaga weryfikacji** | nieznany skład dowolnego składnika przy wykluczonym alergenie lub własnej alergii/nietolerancji, „może zawierać” przy nietolerancji |
| **Brak wykrytych konfliktów** | żadna z powyższych — **nigdy „bezpieczny”** |

Bez zapisanych ustawień przepisy nie mają oceny (komunikat z linkiem do ustawień).

**Baza danych:** pierwsza migracja katalogu (`supabase/migrations/20261026140000_catalog.sql`)
z RLS — publiczny odczyt, zapis tylko `service_role`. Aplikacja na razie czyta dane z kodu
przez interfejs `ProductCatalogProvider`; podłączenie Supabase — etap 7.

### Ograniczenia obecnej wersji

- Brak kont i trwałego zapisu (wymaga Supabase — etap 7); preferencje tylko w karcie przeglądarki.
- Kalkulator nie korzysta jeszcze z preferencji (będą użyte przez generator — etap 5).
- Katalog to tylko dane demo; brak prawdziwego źródła danych odżywczych (planowane przez
  `NutritionDataProvider`, etap 4+). Brak wyszukiwarki i dodawania produktów.
- Konflikty preferowanych produktów z dietą (np. „jogurt” przy diecie wegańskiej) nie są
  wykrywane — preferowane produkty to wolny tekst niepowiązany z katalogiem; przeniesione do
  generatora (etap 5), który będzie dopasowywał je do produktów z kategoriami.
- Dopasowanie własnych wykluczeń (wolny tekst) do produktów jest heurystyczne (fragment nazwy
  lub składu) — dlatego przy nieznanym składzie wynik to „wymaga weryfikacji”.
- Budżet i sklepy — ekrany oznaczone jako niedostępne. Brak cen, generatora i listy zakupów.

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
