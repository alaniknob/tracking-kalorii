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
