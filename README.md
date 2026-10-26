# tracking-kalorii

Aplikacja webowa (PL) do szacowania zapotrzebowania kalorycznego, planowania jadłospisów
i optymalizacji kosztów zakupów. Stan: **etapy 1–7** — fundament; profil, kalkulator,
preferencje, alergie; produkty i przepisy (dane przykładowe) z oceną zgodności; sklepy,
ceny (przykładowe + import CSV), promocje, koszt przepisu i budżet; generator jadłospisu
na 7 dni; lista zakupów; **konta Supabase** (rejestracja/logowanie, trwały zapis, historia
planów, ręczna zamiana posiłku, usuwanie konta, RLS).

## Uruchomienie

Wymagania: Node.js ≥ 20.9.

```bash
npm install
cp .env.example .env.local   # etapy 1–6 działają bez zmiennych; konta: docs/KONFIGURACJA.md
npm run dev                   # http://localhost:3000
```

Bez zmiennych Supabase logowanie pokazuje „Brak konfiguracji” i **nie udaje** sesji.
Klucz publishable (`sb_publishable_…`) wklejasz jako `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Weryfikacja

```bash
npm run check                         # typecheck + lint + testy jednostkowe + build
npx playwright install chromium       # jednorazowo
npm run build && npm run test:e2e     # testy E2E
npm run test:sql                      # constrainty i RLS na lokalnym PostgreSQL 16
```

## Dokumentacja

- [Specyfikacja produktu](docs/PRODUCT_SPEC.md)
- [Architektura](docs/ARCHITECTURE.md)
- [Model danych](docs/DATA_MODEL.md)
- [Plan rozwoju](docs/ROADMAP.md)
- [Decyzje](docs/DECISIONS.md)
- [Konfiguracja Supabase (konta)](docs/KONFIGURACJA.md)

Wyniki kalkulatora są szacunkiem, nie poradą medyczną.
