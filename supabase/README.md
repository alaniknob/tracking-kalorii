# Supabase

Wersjonowane migracje PostgreSQL. Aplikacja łączy się z Auth i tabelami użytkownika **tylko**
gdy są `NEXT_PUBLIC_SUPABASE_URL` i `NEXT_PUBLIC_SUPABASE_ANON_KEY` (klucz anon JWT albo
`sb_publishable_…`). Instrukcja dla Natalii: `docs/KONFIGURACJA.md`.

| Plik | Zawartość |
| --- | --- |
| `migrations/20261026140000_catalog.sql` | katalog publiczny + RLS (odczyt publiczny, zapis `service_role`) |
| `migrations/20261026150000_pricing.sql` | `stores`, `store_prices`, `promotions` + RLS jak wyżej |
| `migrations/20261026170000_accounts.sql` | profil, preferencje, wykluczenia, sklepy, zapasy, import cen, plany, listy, `user_drafts`, RLS właściciela, `delete_own_account()` — **bez DDL w schema auth** (SQL Editor na hoście) |
| `local-auth-stub.sql` | szkielet `auth.users` / `auth.uid()` **tylko** na lokalnym Postgresie; nie wklejać w panelu |
| `seed.sql` | **dane przykładowe** — plik generowany, nie edytować ręcznie |
| `tests/catalog.test.sql` | constrainty i RLS katalogu; `rollback` |
| `tests/pricing.test.sql` | constrainty i RLS cen; `rollback` |
| `tests/accounts.test.sql` | constrainty i RLS właściciela (dwa użytkownicy, kaskada usunięcia); `rollback` |

- Migracje stosowane w kolejności nazw `YYYYMMDDHHMMSS_opis.sql`. Migracji już zastosowanych
  nie edytujemy — każda zmiana schematu to nowa plik.

## Testy SQL (lokalny PostgreSQL)

```bash
npm run test:sql
```

Skrypt tworzy bazę `tk_test`, role `anon` / `authenticated` / `service_role`, wgrywa
`local-auth-stub.sql`, migracje i seed, uruchamia `supabase/tests/*.sql`.

## Seed

```bash
npm run db:seed:generate
```

## Hostowany projekt

SQL Editor (kolejność z `docs/KONFIGURACJA.md`) albo `npx supabase link` + `npx supabase db push`.
`SUPABASE_SERVICE_ROLE_KEY` tylko po stronie serwera, opcjonalnie do usuwania konta.
