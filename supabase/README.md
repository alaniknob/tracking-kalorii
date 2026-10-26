# Supabase

Katalog przygotowany pod wersjonowane migracje PostgreSQL (Supabase CLI).

- `migrations/` — pliki `YYYYMMDDHHMMSS_opis.sql`, stosowane w kolejności nazw. Migracji
  już zastosowanych nie edytujemy — każda zmiana schematu to nowy plik.
- Docelowy schemat, polityki RLS i kolejność wprowadzania tabel: `docs/DATA_MODEL.md`.

Na etapach 1–2 baza nie jest jeszcze używana (brak migracji). Pierwsze migracje powstaną
w etapie 3 (katalog produktów i przepisów) oraz 7 (profile, RLS).

## Uruchomienie lokalne (gdy pojawią się migracje)

```bash
npx supabase init        # jednorazowo, tworzy supabase/config.toml
npx supabase start       # lokalny Postgres + Auth (wymaga Dockera)
npx supabase db reset    # odtwarza bazę z migracji
```

Połączenie z projektem w chmurze: `npx supabase link --project-ref <ref>`, następnie
`npx supabase db push`. Klucze — zob. `.env.example`.
