# Model danych

> **Stan obecny (etap 2): aplikacja nie korzysta z bazy danych.** Brak migracji w
> `supabase/migrations/`. Poniżej docelowy schemat PostgreSQL (Supabase) — zostanie wprowadzony
> migracjami w etapach 3, 4, 5, 6 i 7. Typy domenowe w kodzie (`src/features/*/types.ts`) są
> zgodne z nazwami kolumn (camelCase ↔ snake_case).

## Typy domenowe już zdefiniowane w kodzie

`src/features/nutrition/types.ts`:

| Typ | Wartości |
| --- | --- |
| `Sex` | `female`, `male`, `unspecified` |
| `ActivityLevel` | `sedentary`, `light`, `moderate`, `active`, `very_active` |
| `Goal` | `lose_weight`, `maintain`, `gain_weight`, `build_muscle` |
| `HealthFlag` | `pregnancy`, `breastfeeding`, `diabetes`, `kidney_disease`, `cardiovascular_disease`, `eating_disorder`, `other_condition` |
| `NutritionResult` | `restricted` / `goal_blocked` / `ok` (BMR, TDEE, cel kcal, makro, ostrzeżenia) |

## Zasady ogólne

- Klucze główne `uuid` (`gen_random_uuid()`), znaczniki `created_at`, `updated_at` (`timestamptz`).
- Kwoty jako `numeric(10,2)` + `currency char(3) default 'PLN'` — nigdy `float`.
- Ilości w jednostkach bazowych: gramy (`numeric(10,2)`) lub mililitry; jednostka w `unit`
  (`g`, `ml`, `szt`), dla sztuk — `grams_per_piece`.
- Słowniki jako `text` + `check` (lub tabele słownikowe) — łatwiejsze migracje niż `enum`.
- Każda tabela z danymi użytkownika ma `user_id uuid not null references auth.users on delete cascade`
  (usunięcie konta usuwa dane) i indeks na `user_id`.

## Tabele

### Użytkownik i profil (etap 7)

**`profiles`** — 1:1 z `auth.users`
`user_id` PK/FK, `birth_date date not null`, `height_cm numeric(5,1) check 120–230`,
`weight_kg numeric(5,1) check 35–300`, `target_weight_kg numeric(5,1) null`,
`sex text check in (female, male, unspecified) default 'unspecified'`,
`activity_level text not null`, `goal text not null`, `meals_per_day smallint check 2–6`,
`max_prep_minutes smallint null`, `weekly_budget_pln numeric(10,2) null check > 0`.

**`profile_health_flags`** — dane szczególnej kategorii, osobna tabela, osobna polityka
`user_id`, `flag text check in (…HealthFlag)`, PK (`user_id`, `flag`).

**`user_preferences`** — `user_id`, `diet_style text[]` (np. `vegetarian`, `fish_ok`),
`max_ingredients smallint`, `difficulty text`, `use_leftovers boolean`, `kitchen_equipment text[]`.

**`user_exclusions`** — rozróżnia rodzaj wykluczenia
`id`, `user_id`, `kind text check in (allergy, intolerance, dislike, voluntary)`,
`allergen_code text null references allergens(code)`, `product_id uuid null references products`,
`custom_label text null`, `check (allergen_code is not null or product_id is not null or custom_label is not null)`.

**`user_stores`** — `user_id`, `store_id` FK, PK złożony.

**`pantry_items`** (zapasy) — `user_id`, `product_id`, `quantity_g`, `expires_on date null`.

### Katalog publiczny (etap 3–4)

**`allergens`** — 14 alergenów UE (rozp. 1169/2011, zał. II): `code` PK
(`gluten`, `crustaceans`, `eggs`, `fish`, `peanuts`, `soybeans`, `milk`, `nuts`, `celery`,
`mustard`, `sesame`, `sulphites`, `lupin`, `molluscs`), `name_pl`.

**`products`** — `id`, `name`, `brand null`, `category text not null`, `unit text`,
`package_size numeric null`, `ingredients_text text null`, `source text not null`,
`source_url text null`, `data_completeness text check in (complete, partial, minimal)`,
`is_demo boolean not null default false`, `updated_at`.

**`product_nutrition`** — 1:1 z `products`: `per_basis text check in (100g, 100ml)`, `kcal`,
`protein_g`, `fat_g`, `carbohydrates_g`, `fiber_g null`, `check (kcal >= 0 …)`.

**`product_allergens`** — `product_id`, `allergen_code`,
`status text check in (contains, may_contain, free_from_declared)`. Brak wiersza = **brak
wiedzy**, a nie „nie zawiera” — produkt bez kompletnego składu ma status „wymaga weryfikacji”.

**`recipes`** — `id`, `name`, `description`, `servings smallint > 0`, `prep_minutes`,
`instructions text`, `equipment text[]`, `source`, `reliability text`, `is_demo boolean`,
`cooked_yield_g numeric null` (masa po przygotowaniu). Kcal/makro/alergeny **wyliczane** ze
składników (widok lub funkcja), nie przechowywane na sztywno.

**`recipe_ingredients`** — `recipe_id` FK (cascade), `product_id` FK, `quantity_g numeric > 0`
(masa surowa), `optional boolean`, indeks na `product_id`.

**`stores`** — `id`, `name` (Lidl, Biedronka, Kaufland, Aldi, Carrefour, Auchan, …), `chain`,
`is_active`. Lista konfigurowalna.

**`store_prices`** — oddzielone od wartości odżywczych
`id`, `product_id`, `store_id`, `price numeric(10,2)`, `currency`, `package_size`, `unit`,
`observed_at timestamptz`, `source text`, `source_kind text check in (import_csv, manual,
provider, estimate)`, `is_estimate boolean`, `valid_until null`. Indeks
(`product_id`, `store_id`, `observed_at desc`). Aktualność liczona przy odczycie.

**`promotions`** — `id`, `product_id`, `store_id`, `promo_price`, `starts_on`, `ends_on`,
`conditions text null`, `source`, `check (ends_on >= starts_on)`.

### Plany i zakupy (etap 5–6)

**`meal_plans`** — `id`, `user_id`, `week_start date`, `target_kcal`, `budget_pln`,
`status text`, `generator_version text`, `input_snapshot jsonb` (bez danych zdrowotnych).

**`meal_plan_items`** — `id`, `meal_plan_id` FK cascade, `day smallint 1–7`, `slot smallint`,
`recipe_id`, `servings numeric`, wyliczone `kcal`, `protein_g`, `fat_g`, `carbohydrates_g`,
`ingredients_cost_pln`.

**`shopping_lists`** — `id`, `user_id`, `meal_plan_id null`, `created_at`.

**`shopping_list_items`** — `id`, `shopping_list_id` FK cascade, `product_id`, `store_id null`,
`quantity_g`, `packages smallint`, `package_price_pln null`, `price_status text`, `in_pantry boolean`,
`checked boolean`.

## Polityki RLS (etap 7)

| Grupa tabel | SELECT | INSERT/UPDATE/DELETE |
| --- | --- | --- |
| Dane użytkownika (`profiles`, `profile_health_flags`, `user_*`, `pantry_items`, `meal_plans*`, `shopping_lists*`) | `auth.uid() = user_id` | `auth.uid() = user_id` |
| Katalog (`allergens`, `products`, `product_*`, `recipes`, `recipe_ingredients`, `stores`, `store_prices`, `promotions`) | publiczny odczyt (`anon`, `authenticated`) | tylko `service_role` (importy po stronie serwera) |

Tabele podrzędne (np. `meal_plan_items`) sprawdzają własność przez `exists` na tabeli nadrzędnej.
Klucz `service_role` nigdy nie trafia do przeglądarki.
