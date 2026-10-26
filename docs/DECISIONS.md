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
