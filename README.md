# tracking-kalorii

Aplikacja webowa (PL) do szacowania zapotrzebowania kalorycznego, planowania jadłospisów
i optymalizacji kosztów zakupów. Stan: **etapy 1–8** — fundament; profil, kalkulator,
preferencje, alergie; produkty i przepisy (dane przykładowe) z oceną zgodności; sklepy,
ceny (przykładowe + import CSV), promocje, koszt przepisu i budżet; generator jadłospisu
na 7 dni; lista zakupów; konta Supabase; **weryfikacja** (bezpieczeństwo, responsywność,
błędy, dokumentacja uruchomienia).

## Uruchomienie

Wymagania: Node.js ≥ 20.9.

```bash
npm install
cp .env.example .env.local   # bez zmiennych działa kalkulator/katalog/generator; konta: docs/KONFIGURACJA.md
npm run dev                   # http://localhost:3000
# pełna instrukcja: docs/URUCHOMIENIE.md
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
- [Uruchomienie i stan prac](docs/URUCHOMIENIE.md)
- [Konfiguracja Supabase (konta)](docs/KONFIGURACJA.md)

Wyniki kalkulatora są szacunkiem, nie poradą medyczną.
