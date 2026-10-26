# Uruchomienie i stan prac

Aplikacja (etapy 1–8) działa lokalnie **bez** Supabase: kalkulator, katalog, generator i lista zakupów w karcie przeglądarki. Konta i trwały zapis wymagają projektu Supabase.

Kluczy **nie wklejaj** do czatu, zrzutów ani repozytorium.

## Szybki start (komputer)

1. Node.js ≥ 20.9, `npm install`
2. `cp .env.example .env.local`
3. Konta: uzupełnij `NEXT_PUBLIC_SUPABASE_URL` i `NEXT_PUBLIC_SUPABASE_ANON_KEY` (klucz **anon** albo **publishable** `sb_publishable_…` — ten sam slot). Szczegóły: [KONFIGURACJA.md](./KONFIGURACJA.md)
4. `npm run dev` → http://localhost:3000
5. Bez zmiennych logowanie pokazuje **„Brak konfiguracji”** i nie udaje sesji — to zamierzone.

## Supabase (konta)

Kolejność SQL Editor (cały plik, Run):

1. `supabase/migrations/20261026140000_catalog.sql`
2. `supabase/migrations/20261026150000_pricing.sql`
3. `supabase/migrations/20261026170000_accounts.sql` (bez zapisu do schema `auth`; nie wklejaj `local-auth-stub.sql`)
4. opcjonalnie `supabase/seed.sql`

Jeśli 1–2 już weszły, a 3 padło na `permission denied for schema auth`: nic nie dropuj —
wklej ponownie tylko poprawiony plik kont.

Albo: `npx supabase login` → `link --project-ref …` → `db push`.

**Authentication → URL Configuration**

- Site URL: `http://localhost:3000` (produkcja: Twoja domena)
- Redirect URLs: `http://localhost:3000/auth/callback` oraz produkcyjny `https://…/auth/callback`

**Confirm email:** włączone = po rejestracji „Sprawdź skrzynkę”; wyłączone = od razu sesja.

Usuwanie konta: funkcja `delete_own_account()` z migracji **albo** `SUPABASE_SERVICE_ROLE_KEY` tylko na serwerze (`.env.local` / zmienne hostingu, nigdy `NEXT_PUBLIC_`).

Hosting: te same zmienne; po zmianie `NEXT_PUBLIC_*` zrób nowy deploy.

## Co jest gotowe

- Profil, BMR/TDEE/cel, makro, limity bezpieczeństwa
- Preferencje, alergie UE, konflikty diet
- Katalog demo produktów i przepisów (kcal ze składników)
- Sklepy, budżet, import CSV, koszty (zużyte / opakowania / koszyk)
- Generator 7 dni, zamiana posiłku w twardych filtrach, lista zakupów
- Konta e-mail, zapis na koncie, historia, usuwanie danych, RLS właściciela
- Stany: brak danych, walidacja, niewykonalny plan, brak konfiguracji, 404 — po polsku
- Testy: jednostkowe, E2E (desktop + telefon), SQL/RLS na lokalnym PostgreSQL

## Brakujące integracje (nie udajemy, że są)

| Integracja | Stan |
| --- | --- |
| Prawdziwe dane odżywcze (`NutritionDataProvider`) | interfejs jest; w aplikacji dane demo |
| Ceny sklepów / promocje na żywo | tylko demo + CSV użytkowniczki; **brak scrapingu** |
| SMTP produkcyjny (maile potwierdzające) | ustawienia w panelu Supabase |
| Warstwa AI | niepodłączona; liczby liczy kod |
| Aplikacja natywna | zalążek `GET /api/v1/me` i `/plans` (sesja ciasteczkowa, bez Bearer) |
| Reset hasła w UI | brak (można w panelu Auth) |

## Do zrobienia przed publicznym startem

- Wgrać migracje na projekt Supabase (agent nie ma hasła bazy)
- Ocena RODO / dane szczególnych kategorii (alergie, choroby) — zgoda przy rejestracji i usuwanie konta **nie zastępują** polityki prywatności ani DPIA
- Więcej przepisów (19 demo — ostre filtry bywają niewykonalne)
- Wyszukiwarka i własne produkty/przepisy
- Ręczne pozycje listy zakupów, eksport/druk, tryb offline
- Odzyskiwanie hasła, 2FA, CSP z nonce
- Współdzielenie planu między osobami

Wyniki są szacunkiem, nie poradą medyczną.
