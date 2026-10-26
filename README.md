# tracking-kalorii

Aplikacja webowa (PL) do szacowania zapotrzebowania kalorycznego, planowania jadłospisów
i optymalizacji kosztów zakupów. Stan: **etapy 1–3** — fundament; profil, kalkulator, preferencje, alergie; produkty i przepisy
(wyłącznie dane przykładowe) z oceną zgodności i pierwszą migracją Supabase.

## Uruchomienie

Wymagania: Node.js ≥ 20.9.

```bash
npm install
cp .env.example .env.local   # opcjonalnie — etapy 1–3 nie wymagają zmiennych
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
