# auth

Supabase Auth (e-mail: rejestracja, logowanie, sesja `@supabase/ssr`), zapis
profilu / preferencji / planów, usuwanie konta i danych, RLS właściciela.

Status: etap 7. Bez `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
ekrany kont pokazują „Brak konfiguracji” i nie udają sesji.

Klucz publishable (`sb_publishable_…`) wklejasz jako `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
Usuwanie konta: RPC `delete_own_account()` (migracja) albo opcjonalnie
`SUPABASE_SERVICE_ROLE_KEY` po stronie serwera.

Zob. `docs/KONFIGURACJA.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`.
