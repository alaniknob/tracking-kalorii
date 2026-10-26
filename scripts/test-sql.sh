#!/usr/bin/env bash
# Testy SQL migracji na lokalnym PostgreSQL (role Supabase: anon, authenticated, service_role).
set -euo pipefail
cd "$(dirname "$0")/.."

DB="${TK_TEST_DB:-tk_test}"
PSQL=(psql -v ON_ERROR_STOP=1 --no-psqlrc)

if [[ "$(id -u)" -eq 0 ]]; then
  PSQL=(sudo -u postgres "${PSQL[@]}")
elif command -v sudo >/dev/null && sudo -n -u postgres true 2>/dev/null; then
  PSQL=(sudo -u postgres "${PSQL[@]}")
fi

"${PSQL[@]}" -d postgres -c "select 1" >/dev/null

"${PSQL[@]}" -d postgres -c "drop database if exists ${DB};"
"${PSQL[@]}" -d postgres -c "create database ${DB};"

"${PSQL[@]}" -d "$DB" <<'SQL'
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end;
$$;
grant usage on schema public to anon, authenticated, service_role;
SQL

echo ">> supabase/local-auth-stub.sql"
"${PSQL[@]}" -d "$DB" -f supabase/local-auth-stub.sql

for f in supabase/migrations/*.sql supabase/seed.sql; do
  echo ">> $f"
  "${PSQL[@]}" -d "$DB" -f "$f"
done

for f in supabase/tests/*.sql; do
  echo ">> $f"
  "${PSQL[@]}" -d "$DB" -f "$f"
done

echo "SQL tests: OK"
