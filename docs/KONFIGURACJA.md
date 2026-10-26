# Konfiguracja kont (Supabase) — dla Natalii

Bez tych kroków **logowanie nie działa**. Aplikacja pokazuje wtedy komunikat
„Brak konfiguracji” i **nie udaje** sesji ani zapisu na serwerze. Kalkulator,
katalog, generator i lista zakupów nadal działają w karcie przeglądarki.

Kluczy **nie wklejaj** do czatu, zrzutów ani repozytorium. Trafiają wyłącznie
do `.env.local` na Twoim komputerze oraz do zmiennych środowiska hostingu
(np. Vercel → Settings → Environment Variables).

## 1. Plik `.env.local` (komputer)

W katalogu projektu:

```bash
cp .env.example .env.local
```

Uzupełnij (Panel Supabase → **Project Settings → API**):

| Zmienna | Co wkleić |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL, np. `https://….supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | klucz **anon public** **albo** nowy **publishable** (`sb_publishable_…`) — ten sam slot |
| `SUPABASE_SERVICE_ROLE_KEY` | **opcjonalnie**, tylko serwer — patrz punkt 6 |

Nigdy nie dawaj `SUPABASE_SERVICE_ROLE_KEY` prefiksu `NEXT_PUBLIC_`.

Po zmianie `.env.local` zrestartuj `npm run dev`. Zmienne `NEXT_PUBLIC_*` wchodzą
też do buildu produkcyjnego (`npm run build`).

## 2. Migracje w bazie (kolejność)

Aplikacja **nie** utworzy tabel sama. Trzeba wgrać pliki SQL **w tej kolejności**.

### Wariant A — SQL Editor w panelu (gdy nie masz hasła bazy / CLI)

Dashboard projektu → **SQL Editor** → New query. Wklej **cały** plik, Run.
Kolejność **musi** być taka:

1. `supabase/migrations/20261026140000_catalog.sql`
2. `supabase/migrations/20261026150000_pricing.sql`
3. `supabase/migrations/20261026170000_accounts.sql` — **nie** tworzy nic w `auth`
   (to schema Supabase; SQL Editor nie może tam pisać). Pliku
   `supabase/local-auth-stub.sql` **nie wklejaj** na hoście.
4. `supabase/seed.sql` (dane przykładowe; można pominąć, ale katalog w bazie będzie pusty — aplikacja i tak czyta demo z kodu)

Jeśli katalog i ceny już weszły, a konta spadły na `permission denied for schema auth`:
**nic nie usuwaj** (błąd był zanim powstały tabele w `public`) i wklej ponownie
**tylko** poprawiony `…_accounts.sql`. Błąd „already exists” = ten krok już był.

### Wariant B — Supabase CLI (gdy możesz zalinkować projekt)

```bash
npx supabase login
npx supabase link --project-ref <ref>   # ref = fragment z URL projektu
npx supabase db push
npx supabase db query --file supabase/seed.sql
```

Hasło bazy jest tylko w panelu (Settings → Database). Ten agent **nie** wgrywa
migracji na projekt hostowany.

## 3. Authentication → URL

**Authentication → URL Configuration:**

- **Site URL:** adres, pod którym otwierasz aplikację  
  - lokalnie: `http://localhost:3000`  
  - produkcja: `https://twoja-domena`
- **Redirect URLs** (dodaj wszystkie, z których korzystasz):
  - `http://localhost:3000/auth/callback`
  - `https://twoja-domena/auth/callback`

Bez `/auth/callback` potwierdzenie e-maila nie wróci do aplikacji.

## 4. Potwierdzenie e-maila

**Authentication → Providers → Email:**

- Jeśli **Confirm email** jest **włączone**: po rejestracji aplikacja pokaże
  „Sprawdź skrzynkę…” i **nie** zaloguje, dopóki nie klikniesz linku.
  W skrzynce (i w **Authentication → Users** / logach) musi dojść wiadomość.
  W projekcie testowym możesz w Settings → Auth wyłączyć potwierdzenie
  albo użyć własnego SMTP.
- Jeśli **wyłączone**: rejestracja od razu loguje.

Szablony e-mail: Authentication → Email Templates. Link musi prowadzić do
Site URL + `/auth/callback`.

## 5. RLS (co już jest w migracji)

Po `…_accounts.sql` użytkowniczka widzi **tylko swoje** wiersze
(`auth.uid() = user_id`). Katalog (produkty, przepisy, ceny demo) jest
publiczny do odczytu; zapisu katalogu nie ma z aplikacji.

## 6. Usuwanie konta — `SUPABASE_SERVICE_ROLE_KEY`

Migracja dodaje funkcję `delete_own_account()`: zalogowana osoba usuwa
**siebie** (i kaskadowo swoje dane), bez klucza w aplikacji.

Jeśli funkcja **nie** jest w bazie (migracja nie wgrana), usunięcie konta
wymaga klucza **service_role**:

- na komputerze: `SUPABASE_SERVICE_ROLE_KEY` w `.env.local`
- na hostingu: ta sama zmienna w ustawieniach serwera (nie w przeglądarce)

Klucz service_role omija RLS — trzymaj go w sekrecie. Aplikacja używa go
**tylko** do `auth.admin.deleteUser` przy usuwaniu konta, nigdy w kliencie.

## 7. Hosting (Vercel / inny)

Ustaw te same zmienne co w `.env.local`. Po zapisie zrób nowy deploy
(build wczytuje `NEXT_PUBLIC_*` w czasie kompilacji). Redirect URL produkcyjny
musi być na liście w punkcie 3.

## 8. Szybka lista kontrolna

1. `.env.local`: URL + klucz anon/publishable (`sb_publishable_…` jest OK).
2. SQL Editor: katalog → ceny → konta → (opcjonalnie) seed.
3. Auth: Site URL + `…/auth/callback` na liście Redirect URLs.
4. Decyzja: potwierdzenie e-maila włączone czy nie.
5. Restart `npm run dev` / nowy deploy.
6. Rejestracja testowa → panel nie pokazuje „Brak konfiguracji”.
7. Usunięcie konta: migracja **albo** `SUPABASE_SERVICE_ROLE_KEY` po stronie serwera.

Pełny start i lista gotowe / do zrobienia: `docs/URUCHOMIENIE.md`.
