# tracking-kalorii

Aplikacja webowa (PL) do szacowania zapotrzebowania kalorycznego, planowania jadłospisów
i optymalizacji kosztów zakupów. Stan: **etapy 1–6** — fundament; profil, kalkulator, preferencje, alergie; produkty i przepisy
(wyłącznie dane przykładowe) z oceną zgodności; sklepy, ceny (przykładowe + import CSV),
promocje, koszt przepisu i budżet z diagnozą; deterministyczny generator jadłospisu na 7 dni
(zapasy, resztki, trzy rodzaje kosztu, diagnoza niewykonalności) z widokiem tygodnia
i posiłku; lista zakupów z planu (sumowanie, opakowania, kategorie / sklepy, zapasy,
odhaczanie, brakujące ceny); migracje Supabase z RLS.

## Uruchomienie

Wymagania: Node.js ≥ 20.9.

```bash
npm install
cp .env.example .env.local   # opcjonalnie — etapy 1–6 nie wymagają zmiennych
npm run dev                   # http://localhost:3000
```

## Weryfikacja

```bash
npm run check                         # typecheck + lint + testy jednostkowe + build
npx playwright install chromium       # jednorazowo
npm run build && npm run test:e2e     # testy E2E
```

## Dokumentacja

- [Specyfikacja produktu](docs/PRODUCT_SPEC.md)
- [Architektura](docs/ARCHITECTURE.md)
- [Model danych](docs/DATA_MODEL.md)
- [Plan rozwoju](docs/ROADMAP.md)
- [Decyzje](docs/DECISIONS.md)

Wyniki kalkulatora są szacunkiem, nie poradą medyczną.
