# Supabase

Wersjonowane migracje PostgreSQL (Supabase CLI). Aplikacja **jeszcze nie łączy się** z bazą
(katalog demo jest czytany z kodu) — połączenie w etapie 7.

| Plik | Zawartość |
| --- | --- |
| `migrations/20261026140000_catalog.sql` | katalog publiczny: `allergens` (14 UE), `products`, `product_nutrition`, `product_allergens`, `recipes`, `recipe_ingredients` + RLS (odczyt publiczny, zapis tylko `service_role`) |
| `seed.sql` | **dane przykładowe** (18 produktów, 6 przepisów, wszystkie `is_demo = true`) — plik generowany, nie edytować ręcznie |
| `tests/catalog.test.sql` | asercje ograniczeń i RLS (jako `anon` i `authenticated`); kończy się `rollback` |

- Migracje stosowane w kolejności nazw `YYYYMMDDHHMMSS_opis.sql`. Migracji już zastosowanych
  nie edytujemy — każda zmiana schematu to nowy plik.
- Schemat i polityki RLS: `docs/DATA_MODEL.md`.

## Seed

`seed.sql` powstaje z `src/features/products/demo-products.ts` i
`src/features/recipes/demo-recipes.ts`. Test Vitest pilnuje zgodności; po zmianie danych demo:

```bash
npm run db:seed:generate
```

## Uruchomienie lokalne

Z Supabase CLI (wymaga Dockera):

```bash
npx supabase init        # jednorazowo, tworzy supabase/config.toml
npx supabase start       # lokalny Postgres + Auth
npx supabase db reset    # migracje + seed.sql
```

Bez Dockera — zwykły PostgreSQL ≥ 15 (role `anon`, `authenticated`, `service_role` tworzy
Supabase; lokalnie trzeba je dodać ręcznie):

```bash
createdb tk_test
psql -d tk_test -c "create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;"
psql -d tk_test -v ON_ERROR_STOP=1 -f supabase/migrations/20261026140000_catalog.sql
psql -d tk_test -v ON_ERROR_STOP=1 -f supabase/seed.sql
psql -d tk_test -v ON_ERROR_STOP=1 -f supabase/tests/catalog.test.sql
```

Połączenie z projektem w chmurze: `npx supabase link --project-ref <ref>`, następnie
`npx supabase db push`. Klucze — zob. `.env.example`; `SUPABASE_SERVICE_ROLE_KEY` tylko po
stronie serwera.
