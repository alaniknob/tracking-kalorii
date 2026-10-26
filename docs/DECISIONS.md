# Decyzje projektowe

Format: kontekst → decyzja → konsekwencje. Nowe decyzje dopisujemy na końcu.

## D1. Next.js 15.5 (App Router) + React 19.1

Stabilna linia wspierana przez `eslint-config-next`; Server Actions dają walidację na serwerze
bez osobnego API. Fonty systemowe (SF Pro / Segoe / Roboto) zamiast `next/font/google` — styl
Apple, brak zależności od sieci przy buildzie.

## D2. Własne komponenty UI zamiast pakietu

Komponenty w `src/components/ui` (wzorzec shadcn/ui: kod w repo). Brak Radix/CVA na tym etapie —
obecne kontrolki są natywne (dostępne z pudełka). Prymitywy z Radix dodamy dopiero przy
złożonych widżetach (dialog, combobox). Zależności: tylko `clsx` + `tailwind-merge`.

## D3. Tokeny w Tailwind 4 `@theme`

Jedno miejsce dla kolorów, promieni, cieni i fontu (`src/app/globals.css`). Kolor główny granat
`#0f2a4f`, tło `#f5f5f7`, tekst `#1d1d1f`. Komponenty używają nazw semantycznych
(`bg-primary`, `text-muted`), nie wartości. Tryb ciemny — świadomie odłożony.

## D4. i18n bez biblioteki i bez prefiksu locale w URL

Jeden język (pl-PL). Słownik `messages/pl.ts` z typem `Messages` + `Intl` do formatowania.
Wymiana na `next-intl` lub dodanie języka nie wymaga zmian logiki domenowej. Polskie slugi
tras (`/zakupy`, `/ustawienia/budzet`).

## D5. Wzór Mifflina–St Jeora

Najlepiej zwalidowany wzór BMR dla dorosłych (Mifflin i in., Am J Clin Nutr 1990;51:241–7).
Dla płci nieokreślonej — średnia stałych (−78) z ostrzeżeniem o mniejszej dokładności (±83 kcal).
Wiek spoza 19–78 lat → ostrzeżenie. TDEE = BMR × PAL (1,2 / 1,375 / 1,55 / 1,725 / 1,9).
Charakter pracy nie jest osobnym polem — opisy poziomów aktywności obejmują pracę fizyczną,
co eliminuje podwójne liczenie.

## D6. Cel kaloryczny oddzielony od zapotrzebowania

| Cel | Korekta | Limit |
| --- | --- | --- |
| Redukcja | −15% TDEE | maks. −500 kcal/d (≈0,5 kg/tydz.) |
| Utrzymanie | 0 | — |
| Zwiększanie masy | +10% TDEE | maks. +400 kcal/d |
| Budowa mięśni | +5% TDEE | maks. +250 kcal/d |

Dolna granica: `max(1200 K / 1500 M i nieokr., BMR)`. Gdy granica ≥ TDEE — brak deficytu
(`no_safe_deficit`). Kaloryczność zaokrąglana do 10 kcal. Deficyt nie jest domyślny — domyślny
cel w formularzu to utrzymanie.

## D7. Makroskładniki

Białko g/kg: redukcja 1,6, utrzymanie 1,2, zwiększanie 1,4, mięśnie 1,8; przy BMI ≥ 30 od masy
odpowiadającej BMI 25; maks. 35% energii. Tłuszcz 30% energii (zakres zaleceń 20–35%).
Węglowodany — reszta. Błonnik min. 14 g/1000 kcal (IOM). Atwater 4/4/9.

## D8. Bezpieczeństwo przed wynikiem

Niepełnoletni, ciąża, karmienie piersią, zaburzenia odżywiania, choroby → wynik `restricted`
bez żadnych liczb (nie tylko bez deficytu), bo wzory dla zdrowych dorosłych mogą wprowadzać
w błąd. Niedowaga + redukcja lub masa docelowa z BMI < 18,5 → `goal_blocked` (pokazujemy BMR/TDEE).
Wiek 10–17 przechodzi walidację, aby pokazać bezpieczny komunikat zamiast ogólnego błędu.

## D9. Data urodzenia zamiast wieku

Profil będzie przechowywany długo; wiek liczony w dniu obliczeń. Schemat przyjmuje
`referenceDate`, co czyni testy deterministycznymi.

## D10. Walidacja wyłącznie na serwerze, formularz `noValidate`

Jedno źródło reguł (Zod) i jednolite polskie komunikaty. Przecinek dziesiętny akceptowany.
Po akcji React resetuje formularz — formularz ma `key` z przesłanych wartości, aby zachować
wpisane dane (także w `<select>`).

## D11. Brak zapisu danych do czasu etapu 7

Bez skonfigurowanego Supabase nie udajemy kont ani zapisu: kalkulator działa bezstanowo,
a ekrany kont informują o wymaganej konfiguracji. `@supabase/supabase-js` zostanie dodany
razem z pierwszym realnym użyciem.

## D12. Testy

Vitest dla logiki domenowej i walidacji (środowisko `node`), Playwright na buildzie
produkcyjnym w dwóch profilach (Desktop Chrome, Pixel 7). E2E sprawdza m.in., że żaden link
z listy ekranów nie prowadzi do 404.

## D13. Sposoby żywienia jako reguły na grupach żywności

Każdy sposób żywienia to `{ forbids, requires }` na grupach (`meat`, `fish`, `seafood`, `eggs`,
`dairy`, `honey`) — `DIET_STYLE_RULES` w `features/preferences/diet-styles.ts`. Opcje można
łączyć; wynik to suma wykluczeń. Nowy sposób żywienia = nowy wpis + tekst. „Tradycyjna” nie
nakłada ograniczeń. „Bezmięsna” wyklucza tylko mięso (ryby dozwolone) — dzięki temu
pescowegetarianizm to „Bezmięsna + Z rybami”, a „Wegetariańska + Z rybami” jest sprzecznością.

## D14. Konflikty: blokujące vs rozstrzygnięte

Sprzeczność wyłącznie w wyborach użytkownika (dieta vs dieta, lubię vs nie lubię) blokuje
przyjęcie ustawień — nie zgadujemy intencji. Konflikt z alergią/nietolerancją/wykluczeniem
rozstrzygamy automatycznie na korzyść ograniczenia (bezpieczeństwo > smak) i informujemy.
Reguły nigdy nie są łagodzone.

## D15. Alergia vs nietolerancja vs wykluczenie

Alergia może wykluczać także „może zawierać” (opcja, domyślnie włączona), nietolerancja
wyklucza tylko produkty zawierające składnik, a ślady oznacza „wymaga weryfikacji”. Własne
wpisy są przechowywane z rodzajem (`allergy`, `intolerance`, `voluntary`, `dislike`). Ocena
produktu nigdy nie zwraca „bezpieczny” — najwyżej `no_declared_conflict`.

## D16. Tymczasowe przechowywanie preferencji w sessionStorage

Bez kont nie zapisujemy danych na serwerze (dane o alergiach to dane o zdrowiu). Aby wykrywać
konflikty między dwoma ekranami, przeglądarka trzyma surowe wartości formularzy w
`sessionStorage` (tylko bieżąca karta) i dołącza wersję roboczą drugiego ekranu do zapisu;
serwer waliduje ją tym samym schematem Zod co formularz, a niepoprawną pomija. W etapie 7
zostanie to zastąpione zapisem w Supabase (tabele `user_preferences`, `user_exclusions`).
Dopasowanie produktów tekstowych: normalizacja (NFC, małe litery `pl-PL`, spacje).

## D17. Przepisy: ilości surowe, wartości zawsze wyliczane

Składniki przepisu są zapisane w stanie **surowym** (tak jak się je kupuje i waży), a kcal,
makro i alergeny przepisu są zawsze liczone ze składników (`calculateRecipeNutrition`) — nie ma
ich ani w typie `Recipe`, ani w tabeli `recipes`. Masa po przygotowaniu (`cooked_yield_g`)
służy tylko do przeliczenia „na 100 g potrawy”; gdy jej brak, tej wartości nie pokazujemy
(woda odparowuje / wchłania się — zgadywanie dawałoby błędne liczby). Brakujące dane składnika
(wartości odżywcze, masa sztuki, gęstość) dają ostrzeżenie „dane niepełne”, nie zero.

## D18. Ocena przepisu: trzy stany, nigdy „bezpieczny”

`evaluateRecipeFit` zwraca `excluded`, `needs_verification` albo `no_conflict_found`
(UI: „Brak wykrytych konfliktów”). Alergeny przepisu = suma alergenów składników, „zawiera”
wygrywa z „może zawierać”; nieznany skład **dowolnego** składnika oznacza nieznany skład
przepisu. Wykluczenie zawsze wygrywa z weryfikacją; preferencje nie łagodzą żadnego wykluczenia.

## D19. Własne wykluczenia — dopasowanie heurystyczne

Inne alergie, nietolerancje i dobrowolne wykluczenia to wolny tekst. Dopasowujemy je po
znormalizowanym fragmencie nazwy produktu (a dla alergii i nietolerancji także składu).
To heurystyka: brak dopasowania przy nieznanym składzie któregokolwiek składnika daje
„wymaga weryfikacji”, nie „brak konfliktów”. Dokładne dopasowanie wymaga powiązania
wykluczeń z produktami z katalogu (etap 7, `user_exclusions.product_id`).

## D20. Wyłącznie dane przykładowe, wyraźnie oznaczone

Bez licencjonowanego źródła danych nie publikujemy wartości jako „prawdziwych”. Katalog demo
to produkty generyczne bez marek i cen, z przybliżonymi wartościami typowymi; każdy rekord ma
`source.isDemo` / `is_demo = true`, przepisy mają wiarygodność „niezweryfikowany”, a ekrany
pokazują plakietkę i baner „Dane przykładowe”. Prawdziwe źródła — przez interfejsy dostawców.

## D21. Dostawcy katalogu i seed generowany z kodu

Strony korzystają z `ProductCatalogProvider` / `RecipeCatalogProvider`; teraz implementacja
w pamięci, w etapie 7 — Supabase, bez zmian w logice. Jedynym źródłem danych demo jest
TypeScript; `supabase/seed.sql` generuje `buildDemoSeedSql()`, a test Vitest nie przepuści
nieaktualnego pliku (`npm run db:seed:generate`). Kompletność danych nie jest kolumną —
jest wyliczana, żeby nie mogła rozjechać się z danymi. RLS katalogu: odczyt dla `anon` i
`authenticated`, zapis tylko `service_role`; schemat i RLS sprawdzone na PostgreSQL 16
(`supabase/tests/catalog.test.sql`).

## D22. Nawigacja mobilna jako siatka

Pięć pozycji głównej nawigacji nie mieści się obok logo na telefonie. Zamiast przewijania
w poziomie (słabo odkrywalne) nawigacja na wąskich ekranach jest osobnym wierszem
`grid-cols-5` z krótkimi etykietami; od `sm` — jeden wiersz. Lista zakupów wypadła
z głównej nawigacji (dostępna ze strony głównej) do czasu etapu 6.

## D23. Kwoty w groszach

W kodzie wszystkie kwoty są liczbami całkowitymi w groszach (`Grosze`), a w bazie
`numeric(10,2)`. Bez ułamków zmiennoprzecinkowych przy sumowaniu; koszt zużytej części opakowania
(`proportionalGrosze`) zaokrąglamy do grosza dopiero na końcu. Parser kwot (`parsePlnToGrosze`)
przyjmuje „3,49”, „3.49”, „1 299,00”, „3,49 zł” i odrzuca więcej niż 2 miejsca po przecinku.

## D24. Aktualność ceny liczona przy odczycie

Cena potwierdzona jest „aktualna” przez 14 dni od daty pozyskania (`PRICE_STALE_AFTER_DAYS`
w `pricing/constants.ts`), potem „nieaktualna”; szacunkowa zawsze „szacunkowa”. Status nie jest
zapisywany w bazie (zestarzałby się), tylko liczony z `observed_on` i dzisiejszej daty
w strefie Europe/Warsaw. 14 dni to kompromis: ceny w sieciach zmieniają się zwykle co
gazetkę (1–2 tygodnie). Promocja: nadchodząca / aktywna / wygasła wg `starts_on`–`ends_on`.

## D25. Potwierdzone i szacunkowe nigdy razem

Wybór oferty dla produktu: najpierw status (aktualna > nieaktualna > szacunkowa), dopiero potem
koszt opakowań i resztki — tańsza cena szacunkowa nie wypiera potwierdzonej. Sumy (koszt
zużyty i koszt opakowań) są trzymane osobno dla każdego statusu i tak pokazywane; nie ma
jednej „pewnej” kwoty łączącej potwierdzone z szacunkowymi. Budżet z cenami szacunkowymi daje
wynik „mieści się tylko z cenami szacunkowymi”, nie „mieści się”. Promocji szacunkowych nie ma
(zakaz fałszywych promocji) — także w schemacie bazy.

## D26. Promocje z warunkami nie są wliczane

Warunku („przy zakupie 2 opakowań”, karta klienta) nie da się niezawodnie zinterpretować
z tekstu, a wliczenie go dla jednego opakowania zaniżyłoby koszt. Takie promocje są pokazywane
z opisem, ale wycena używa ceny regularnej. Wygasłe promocje też są pokazywane („wygasła
promocja”), żeby było widać, skąd różnica względem gazetki.

## D27. Import CSV jako wersja robocza, walidowana przy każdym użyciu

Bez kont nie mamy gdzie bezpiecznie zapisać cen użytkownika, więc akcja importu zwraca tylko
raport, a przeglądarka trzyma surowy tekst pliku w `sessionStorage`. Każda wycena importuje go
ponownie na serwerze (`importPricesCsv`) — jedna ścieżka walidacji dla pliku i dla
(potencjalnie zmanipulowanej) wersji roboczej. Błędne wiersze są pomijane z opisem, poprawne
przyjmowane (import częściowy), błąd całego pliku (nagłówki, rozmiar, kodowanie) — odrzuca plik.
W etapie 7 import trafi do osobnej tabeli z `user_id`, nie do publicznego `store_prices`.

## D28. Cena jednostkowa za 1 kg / 1 l w jednostce bazowej produktu

Cena jednostkowa jest liczona po przeliczeniu opakowania na jednostkę bazową produktu (g lub ml,
`toBase` z etapu 3), więc 500 g i 1 kg tego samego produktu są porównywalne. Opakowania na sztuki
dostają dodatkowo cenę za sztukę. Opakowanie, którego nie da się przeliczyć (np. szt bez masy
sztuki), jest pomijane i raportowane, a nie zgadywane.

## D29. Promocje w module cen; uproszczenia koszyka

Promocje są w `features/pricing` (osobny moduł `promotions` usunięty): oferta regularna
i promocyjna to ten sam typ `Offer`, wybierany tą samą funkcją. Uproszczenia etapu 4: jeden
rozmiar opakowania na produkt w koszyku (bez łączenia 500 g + 1 kg), sklep wybierany osobno
dla każdego produktu (bez kosztu dojazdu). Tańsze zamienniki są proponowane tylko, gdy produkt
przechodzi `evaluateProductFit` z regułami użytkownika (alergie > dieta > cena) — bez
zapisanych ustawień propozycja jest oznaczona jako niesprawdzona pod tym kątem.

## D30. Ceny demo ze stałymi datami

Ceny przykładowe mają stałe daty (październik 2026), a nie „dziś minus N dni” — dzięki temu
seed SQL jest deterministyczny, a z upływem czasu ceny demo uczciwie stają się „nieaktualne”.
Testy jednostkowe i E2E podają datę jawnie lub sprawdzają zachowanie niezależne od daty.

## D31. Generator: ocena leksykograficzna zamiast jednej sumy wag

Kolejność ważności z briefu jest zapisana wprost: plan ocenia krotka
`[brak wymaganych grup, energia poza ±10%, makro poza pasmami (w kcal), przekroczenie budżetu
(gr), produkty bez ceny, cele miękkie]`, porównywana element po elemencie. Dzięki temu żadna
kombinacja celów miękkich (koszt, czas, różnorodność) nie „przeważy” kalorii, a budżet nie
przeważy makroskładników. Alergie, dieta i weryfikacja składu w ogóle nie są w ocenie — są
filtrem kandydatów. Wagi celów miękkich (w punktach ≈ groszach: 1 zł kosztu = 100 pkt, minuta
gotowania = 4 pkt, powtórka ponad limit = 1500 pkt, powtórka w tym samym dniu = 4000 pkt,
preferowany produkt = −300 pkt) są w `features/meal-planning/constants.ts` i dobrane tak, by
różnorodność i czas miały znaczenie porównywalne z kilkunastoma złotymi tygodniowo.

## D32. Porcje 0,5–2× porcji przepisu; tolerancja ±10% i pasma makro

Kalorie dnia są dopasowywane porcją (0,5; 0,75; 1; 1,25; 1,5; 1,75; 2 porcji przepisu) —
składniki skalują się proporcjonalnie, więc kcal i makro posiłku nadal wynikają ze składników.
Dzień „w normie” to odchylenie ≤ 10% od celu (typowa dokładność szacunku TDEE jest gorsza).
Pasma makro (białko 85–140%, tłuszcze i węglowodany 70–130% celu) są szersze dla białka w górę,
bo nadwyżka białka przy zdrowych dorosłych jest mniej problematyczna niż niedobór.

## D33. Resztki: ta sama pora następnego dnia

Gdy włączone „Wykorzystuj resztki”, obiad lub kolacja z przepisu na ≥ 2 porcje, powtórzone
następnego dnia o tej samej porze, jest traktowane jako resztki: czas gotowania liczony raz,
a powtórka nie obniża oceny różnorodności. Prosta reguła, zrozumiała w UI („Ugotuj więcej — na
jutro”); bez przechowywania dłużej niż jeden dzień (bezpieczeństwo żywności).

## D34. Przepisy „wymaga weryfikacji” pomijane automatycznie

Generator dopuszcza wyłącznie przepisy z oceną `no_conflict_found`. Przepis z niepełnymi
danymi o składzie przy zapisanych alergiach nie jest dodawany, a plan informuje, ile przepisów
pominięto. Lepszy plan mniej różnorodny niż ryzyko alergenu.

## D35. Plan nie jest zapisywany — odtwarzany z ustawień i daty wyceny

Do czasu kont (etap 7) plan nie trafia do bazy ani na serwer. W karcie zostaje `{ startDate,
generatedOn, fingerprint }`; widok tygodnia i posiłku ponownie uruchamiają deterministyczny
generator z wersjami roboczymi i datą wyceny `generatedOn`, więc wynik jest identyczny.
`fingerprint` (SHA-256 wersji roboczych) wykrywa zmianę ustawień — wtedy stary plan nie jest
pokazywany, bo mógłby nie uwzględniać np. nowej alergii. Plan starszy niż 60 dni wygasa.
Migracja `meal_plans` powstanie z kontami (RLS właściciela wymaga `auth.uid()`).

## D36. Profil w karcie tylko na wyraźne życzenie

Profil zawiera dane o zdrowiu, dlatego nie jest zapisywany automatycznie — użytkownik klika
„Zachowaj profil w tej karcie”. Serwer liczy cel z profilu od nowa przy każdym użyciu (te same
zasady bezpieczeństwa: przy ograniczeniach generator nie działa) i niczego nie loguje.

## D37. Budżet ważniejszy od różnorodności; preferowane produkty vs reguły

Przy ciasnym budżecie generator może powtarzać tani przepis częściej niż limit 2× w tygodniu
(priorytet 6 > 9) — plan pokazuje wtedy uwagę o małej różnorodności. Preferowany produkt
(wolny tekst) jest dopasowywany do nazw z katalogu; jeśli wszystkie dopasowania są wykluczone
przez dietę lub alergie, preferencja jest usuwana z konfliktem „rozstrzygniętym” (np. „jogurt”
przy diecie wegańskiej). Etykieta bez dopasowania nie jest konfliktem.
