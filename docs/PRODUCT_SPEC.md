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

## Stan na koniec etapu 6 (bieżący)

### Działa

| Funkcja | Ścieżka | Uwagi |
| --- | --- | --- |
| Strona główna z listą ekranów i ich statusem | `/` | Status z `src/config/routes.ts` |
| Profil i kalkulator zapotrzebowania | `/onboarding` | Walidacja na serwerze, brak zapisu danych |
| Ustawienia żywieniowe | `/ustawienia/zywienie` | Łączone sposoby żywienia, produkty, gotowanie; wykrywanie konfliktów |
| Alergie i wykluczenia | `/ustawienia/alergie` | 14 alergenów UE (alergia / nietolerancja), ślady, własne wykluczenia |
| Przepisy (lista + szczegóły) | `/przepisy`, `/przepisy/[id]` | Dane demo; kcal i makro ze składników; ocena zgodności z ustawieniami |
| Produkty | `/produkty` | Dane demo; wartości na 100 g/ml, alergeny, kompletność, źródło |
| Ceny i promocje + import CSV | `/ceny` | Ceny demo (oznaczone) + własny plik CSV; ceny jednostkowe, statusy |
| Wybór sklepów | `/ustawienia/sklepy` | 9 sieci + do 10 własnych sklepów |
| Budżet i sprawdzenie koszyka | `/ustawienia/budzet` | Budżet tygodniowy, koszt wybranych przepisów, diagnoza |
| Koszt przepisu | `/przepisy/[id]` | Koszt zużytych składników vs koszt opakowań |
| Generator jadłospisu (7 dni) | `/generator` | Cel z profilu zachowanego w karcie, zapasy, data startu, diagnoza niewykonalności |
| Widok tygodnia | `/plan` | Dni z kcal i makro, trzy rodzaje kosztu, budżet, koszyk, wykorzystane zapasy |
| Szczegóły posiłku | `/plan/posilki/[id]` | Składniki przeliczone na porcję, instrukcja, kcal, makro, koszt, resztki |
| Lista zakupów | `/zakupy` | Z planu tygodnia: sumowanie, opakowania, kategorie / sklepy, zapasy, odhaczanie, koszt |
| Ekrany zastępcze (oznaczone „Niedostępne · Etap N”) | pozostałe | Brak martwych przycisków |
| Strony błędów po polsku | 404, błąd | Bez stack trace'ów |

### Kalkulator (etap 2)

Wejście: data urodzenia, wzrost, masa, opcjonalnie masa docelowa, opcjonalnie płeć
fizjologiczna, poziom aktywności, cel, liczba posiłków, opcjonalne flagi zdrowotne.

Wynik rozróżnia cztery wartości:

1. **BMR** — podstawowa przemiana materii (Mifflin–St Jeor),
2. **TDEE** — całkowite zapotrzebowanie = BMR × współczynnik aktywności,
3. **proponowana kaloryczność** — TDEE skorygowane o cel, z limitami bezpieczeństwa,
4. **kalorie zaplanowanych posiłków** — na ekranie profilu „Brak planu”; średnia dzienna planu
   jest w widoku tygodnia (`/plan`).

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

### Sklepy, ceny, promocje i budżet (etap 4)

**Sklepy:** lista sieci (Lidl, Biedronka, Kaufland, Aldi, Carrefour, Auchan, Dino, Netto,
Stokrotka) w `src/features/stores/stores.ts` + do 10 własnych sklepów (nazwa 2–40 znaków, bez
duplikatów). Wymagany co najmniej jeden sklep. Bez zapisanego wyboru wyceny używają wszystkich
sieci (komunikat z linkiem do wyboru). Nazwa sieci nie oznacza integracji — **nie pobieramy
danych ze sklepów** (brak API, brak scrapingu).

**Ceny przykładowe:** 60 cen i 3 promocje demo (`src/features/pricing/demo-prices.ts`) z
plakietką „Ceny przykładowe” i banerem — nie są aktualnymi cenami sklepów. Część celowo
nieaktualna lub szacunkowa, jedna promocja wygasła, jedna z warunkami, a przyprawa curry nie
ma ceny — żeby było widać każdy stan.

**Import CSV** (`/ceny`, szablon `/szablon-cen.csv`): kolumny wymagane `produkt`, `sklep`,
`cena`, `opakowanie`, `jednostka`, `data`, `zrodlo`; opcjonalne `szacunkowa`, `promocja_od`,
`promocja_do`, `warunki`, `waluta`, `url`. Separator `;`, `,` lub tabulator, UTF-8 (z BOM lub
bez), cudzysłowy RFC 4180, nagłówki bez względu na wielkość liter i polskie znaki. Limity:
200 KB, 2000 wierszy. Każdy wiersz jest walidowany na serwerze: znany produkt (id lub nazwa)
i sklep z listy, waluta PLN, cena 0,01–10 000 zł („3,49”, „3.49”, „3,49 zł”), opakowanie > 0,
jednostka g/kg/ml/l/szt zgodna z produktem (szt wymaga masy sztuki), data ISO lub DD.MM.RRRR
nie z przyszłości i nie starsza niż 2 lata, obie daty promocji i ich kolejność, zakaz
szacunkowych promocji, warunki tylko przy promocji, adres http(s), duplikaty. Błędne wiersze
są pomijane, a raport podaje wiersz, kolumnę i opis (do 100 błędów). Plik **nie jest
zapisywany na serwerze** — trafia tylko do karty przeglądarki i jest ponownie walidowany przy
każdym użyciu.

**Statusy:** cena **aktualna** do 14 dni od daty pozyskania, potem **nieaktualna**;
**szacunkowa** zawsze oznaczona osobno. Promocja **aktywna**, **nadchodząca** lub **wygasła**
(wygasła nie jest wliczana, ale jest pokazywana); promocja **z warunkami** nie jest wliczana
automatycznie. Status liczony w chwili odczytu (strefa Europe/Warsaw). Brak ceny → „Brak ceny”
z przyczyną (brak w wybranych sklepach, tylko szacunkowe przy wyłączonych szacunkach, nieznany
produkt) — nigdy 0 zł.

**Ceny jednostkowe:** za 1 kg lub 1 l (w jednostce bazowej produktu), przy opakowaniach na
sztuki dodatkowo za 1 szt. Cena opakowania i cena jednostkowa są zawsze podpisane osobno.

**Koszt:** wspólne produkty z kilku przepisów są sumowane i kupowane w całych opakowaniach.
Dla każdego produktu wybierana jest oferta wg statusu (aktualna > nieaktualna > szacunkowa —
tańsza szacunkowa nigdy nie wygrywa z potwierdzoną), potem najniższego kosztu opakowań, potem
najmniejszej resztki. Wynik: **koszt zużytych składników** i **koszt koniecznych opakowań**,
każdy rozbity na ceny aktualne / nieaktualne / szacunkowe — **nigdy nie sumujemy potwierdzonych
z szacunkowymi**. Pokazujemy też tańszą ofertę w sklepie spoza wybranych.

**Budżet** (`/ustawienia/budzet`): kwota tygodniowa 20–5000 zł, zgoda na ceny szacunkowe.
Sprawdzenie koszyka: liczba przygotowań każdego przepisu (0–14) → koszt opakowań porównany
z budżetem. Wynik: mieści się / mieści się tylko z cenami szacunkowymi / niepełne dane (brak
cen) / budżet za niski — z potrzebną kwotą (dolna granica), brakującą kwotą, najdroższymi
pozycjami i propozycjami: inny sklep, tańszy zamiennik (ta sama kategoria, ≥ 10% taniej
za kg/l, **tylko zgodny z alergiami i dietą** — `evaluateProductFit`), mniej resztek, brakujące
ceny, zgoda na szacunki, zmiana przepisów. Przepisy wykluczone przez ustawienia są pomijane
z komunikatem.

### Generator jadłospisu (etap 5)

**Wejście** (wszystko z tej karty przeglądarki, walidowane na serwerze przy każdym użyciu):
profil (cel kcal, makro, liczba posiłków 2–6 — zachowywany w karcie **tylko na wyraźne
życzenie** przyciskiem „Zachowaj profil w tej karcie”), ustawienia żywieniowe, alergie, budżet,
sklepy, import cen, zapasy (do 30 pozycji: produkt z katalogu, ilość, jednostka przeliczalna
dla produktu) i pierwszy dzień planu (dziś … +14 dni). Bez profilu lub przy profilu z
ograniczeniami (np. osoba niepełnoletnia, ciąża) generator **nie działa** — pokazuje drogę do
profilu, nie zgaduje kaloryczności. Sprzeczne ustawienia diety blokują generowanie.

**Kolejność ważności** (z briefu, w kodzie jako ocena leksykograficzna — wcześniejsze kryterium
zawsze wygrywa z późniejszym):

1–3. **Bezpieczeństwo, alergie, dieta** — twarde filtry: przepis „wykluczony” albo „wymaga
weryfikacji” (`evaluateRecipeFit`) **nigdy** nie trafia do planu; ograniczenia praktyczne (czas,
trudność, wyposażenie, liczba składników) też są twarde. Grupy wymagane przez dietę (np. „Z
rybami”) — co najmniej raz w tygodniu.
4. **Energia** — każdy dzień w ±10% celu kcal (porcje 0,5–2× porcji przepisu).
5. **Makro** — pasma: białko 85–140%, tłuszcze 70–130%, węglowodany 70–130% celu.
6. **Budżet** — koszt koszyka (całe opakowania minus zapasy) ≤ budżet.
7. **Dostępność** — mniej produktów bez ceny w wybranych sklepach.
8–10. **Cele miękkie** — koszt, mniej resztek opakowań, czas przygotowania, różnorodność (ten sam
przepis gotowany maks. 2× w tygodniu, bez powtórek w jednym dniu), preferowane produkty,
dokładność kcal i białka. Wagi: `src/features/meal-planning/constants.ts`.

Budżet jest ważniejszy od różnorodności: przy ciasnym budżecie przepis może się powtarzać
częściej — plan pokazuje wtedy uwagę „gotowany N razy w tygodniu”.

**Algorytm:** deterministyczny (te same ustawienia i data wyceny → ten sam plan): konstrukcja
zachłanna dzień po dniu, potem lokalna optymalizacja (zamiana przepisu we wszystkich wystąpieniach
— łączy opakowania; zmiana przepisu lub porcji pojedynczego posiłku), maks. 12 przejść.
**Resztki** (gdy włączone): obiad lub kolacja z przepisu na ≥ 2 porcje może być zjedzona
następnego dnia o tej samej porze — „Ugotuj więcej — na jutro”, czas gotowania liczony raz.

**Trzy koszty** (każdy osobno dla cen potwierdzonych i szacunkowych):
koszt zużytych składników, koszt koniecznych opakowań (bez odliczania zapasów) i **do kupienia**
(opakowania po odliczeniu zapasów — porównywany z budżetem). Koszt posiłku = zużyta część
składników według ofert z koszyka.

**Diagnoza:** budżet za niski → status „Plan nie mieści się w budżecie” z potrzebną kwotą,
brakującą kwotą, najdroższymi pozycjami i propozycjami (inny sklep, tańszy zamiennik zgodny z
alergiami i dietą, mniej resztek, brakujące ceny). Planu nie da się ułożyć → powód po polsku
(np. „Brak przepisów na posiłek „Obiad”…” z liczbą odrzuconych wg przyczyny albo „cel kcal poza
zasięgiem”) i konkretne zmiany z linkiem (np. „Zwiększ maksymalny czas przygotowania do co
najmniej 20 min”, „Zaznacz dostępne wyposażenie: Piekarnik”). Alergii i nietolerancji nie
proponujemy luzować nigdy.

**Uwagi do planu:** dni poza tolerancją kcal, makro poza pasmem, brak wymaganej grupy, produkty
bez ceny, ceny szacunkowe, niepełne dane odżywcze, pominięte przepisy wymagające weryfikacji,
mała różnorodność.

**Preferowane produkty vs reguły:** etykieta preferowana jest dopasowywana do nazw produktów z
katalogu; jeśli **wszystkie** pasujące produkty są wykluczone przez dietę lub alergie (np.
„jogurt” przy diecie wegańskiej), preferencja jest usuwana z komunikatem na ekranach ustawień.

**Plan nie jest zapisywany** (do etapu 7): w karcie zostaje tylko data startu, data wyceny i
odcisk ustawień; widok tygodnia i posiłku odtwarzają plan na serwerze. Zmiana dowolnego
ustawienia → komunikat „Ustawienia zmieniły się od wygenerowania planu” bez pokazywania starego
planu (mógłby nie uwzględniać np. nowej alergii). Plan starszy niż 60 dni wygasa.

### Lista zakupów (etap 6)

**Źródło:** lista jest zawsze liczona z planu odtworzonego na serwerze (`buildShoppingList` w
`src/features/shopping/list.ts`, wywoływane w `buildPlanView`) — każda zmiana planu (nowe
generowanie, zmiana zapasów lub daty) od razu daje nową listę; nie ma osobnej kopii do
synchronizacji. Bez planu ekran prowadzi do generatora; przy zmienionych ustawieniach pokazuje
ten sam komunikat co widok tygodnia.

**Pozycja:** jeden produkt = jedna pozycja — ilości ze wszystkich posiłków są **sumowane** (z
listą przepisów i liczbą posiłków). Pokazujemy: potrzebną ilość, ile pokrywają zapasy, ile
kupić, **liczbę całych opakowań** × wielkość w wybranym sklepie, przybliżoną liczbę sztuk (gdy
produkt ma masę sztuki), resztkę z opakowań, cenę opakowania × liczba, status ceny (aktualna /
nieaktualna / szacunkowa) i promocję. Produkt bez ceny zostaje na liście z przyczyną („Brak
ceny”), **nigdy jako 0 zł**.

**Zapasy:** produkty w całości pokryte zapasami trafiają do sekcji „Masz w domu” (z ilością
użytą z zapasów); częściowo pokryte — na listę z odliczoną ilością.

**Grupowanie:** przełącznik „Według kategorii” (kolejność kategorii katalogu) / „Według sklepu”
(sklepy alfabetycznie, grupa „Bez ceny” na końcu); każda grupa ma swój koszt.

**Odhaczanie:** pole wyboru przy każdej pozycji (duży obszar dotyku), pasek postępu, „Do kupienia”
i „Kupione” jako kwoty, opcja „Ukryj kupione”, „Wyczyść odhaczenia”. Odhaczenia są w
`sessionStorage` tej karty jako `{produkt: podpis}`, gdzie podpis = sklep + liczba opakowań +
ilość do kupienia. Gdy po zmianie planu podpis się różni, pozycja **wraca na listę** z plakietką
„Zmieniono po aktualizacji planu” i komunikatem nad listą; produkty, których już nie ma w planie,
są usuwane z odhaczeń.

**Koszt:** suma do kupienia, osobno ceny aktualne / nieaktualne / szacunkowe (nigdy łączone),
liczba produktów bez ceny, data wyceny i wybrane sklepy. Suma listy = koszt „do kupienia” z
widoku tygodnia.

**Telefon:** układ jednokolumnowy (max. 3xl na desktopie), bez poziomego przewijania przy 375 px,
pola wyboru 24 px w etykiecie na całą szerokość wiersza.

### Ograniczenia obecnej wersji

- Brak kont i trwałego zapisu (wymaga Supabase — etap 7); preferencje tylko w karcie przeglądarki.
- Generator ma do dyspozycji tylko 19 przepisów demo — przy ostrych ograniczeniach (np. weganin +
  alergia na soję i gluten, limit 15 min) plan bywa niewykonalny lub mało różnorodny; diagnoza
  wskazuje przyczynę. Ocena jest heurystyczna (lokalne optimum), nie gwarantuje najtańszego planu.
- Brak ręcznej zamiany posiłku w planie i blokowania wybranych posiłków.
- Katalog to tylko dane demo; brak prawdziwego źródła danych odżywczych (planowane przez
  `NutritionDataProvider`, etap 4+). Brak wyszukiwarki i dodawania produktów.
- Preferowane produkty są dopasowywane do katalogu po fragmencie nazwy — etykieta bez
  dopasowania nie jest konfliktem (nie wiemy, czym jest).
- Dopasowanie własnych wykluczeń (wolny tekst) do produktów jest heurystyczne (fragment nazwy
  lub składu) — dlatego przy nieznanym składzie wynik to „wymaga weryfikacji”.
- Ceny to wyłącznie dane przykładowe lub import użytkownika; brak dostawcy prawdziwych cen
  (interfejs `StorePriceProvider` jest gotowy). Import, sklepy i budżet tylko w karcie
  przeglądarki do etapu 7.
- Jeden rozmiar opakowania na produkt w koszyku (bez łączenia np. 500 g + 1 kg); wybór sklepu
  per produkt — bez kosztu dojazdu i minimalnej liczby sklepów.
- Zapasy, plan i odhaczenia listy zakupów tylko w karcie przeglądarki (znikają po jej zamknięciu;
  brak współdzielenia listy między urządzeniami do etapu 7).
- Lista zakupów nie pozwala ręcznie dopisać produktu spoza planu, zmienić sklepu dla pozycji ani
  edytować ilości; brak trybu offline i eksportu/druku.

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
