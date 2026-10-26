# Model danych

> **Stan obecny (koniec etapu 3):** istnieje pierwsza migracja — katalog publiczny
> (`supabase/migrations/20261026140000_catalog.sql`, sekcja „Katalog publiczny” poniżej opisuje
> ją dokładnie). Aplikacja jeszcze **nie łączy się** z bazą: katalog demo czyta z kodu przez
> `ProductCatalogProvider`, a `supabase/seed.sql` jest generowany z tych samych danych.
> Pozostałe tabele to schemat docelowy (etapy 4–7). Typy domenowe w kodzie
> (`src/features/*/types.ts`) są zgodne z nazwami kolumn (camelCase ↔ snake_case).

## Typy domenowe już zdefiniowane w kodzie

`src/features/nutrition/types.ts`:

| Typ | Wartości |
| --- | --- |
| `Sex` | `female`, `male`, `unspecified` |
| `ActivityLevel` | `sedentary`, `light`, `moderate`, `active`, `very_active` |
| `Goal` | `lose_weight`, `maintain`, `gain_weight`, `build_muscle` |
| `HealthFlag` | `pregnancy`, `breastfeeding`, `diabetes`, `kidney_disease`, `cardiovascular_disease`, `eating_disorder`, `other_condition` |
| `NutritionResult` | `restricted` / `goal_blocked` / `ok` (BMR, TDEE, cel kcal, makro, ostrzeżenia) |

`src/features/allergens/eu-allergens.ts` i `src/features/preferences/diet-styles.ts`:

| Typ | Wartości |
| --- | --- |
| `AllergenCode` | 14 kodów UE (jak w tabeli `allergens` poniżej) |
| `AllergenReaction` | `none`, `allergy`, `intolerance` |
| `ExclusionKind` | `allergy`, `intolerance`, `voluntary`, `dislike` |
| `AllergenExclusion` | `{ code, kind: allergy \| intolerance, excludeTraces }` |
| `DietStyle` | `traditional`, `vegetarian`, `vegan`, `meatless`, `with_fish`, `no_fish`, `with_meat` |
| `FoodGroup` | `meat`, `fish`, `seafood`, `eggs`, `dairy`, `honey` |
| `KitchenEquipment` | `stove`, `oven`, `microwave`, `blender`, `air_fryer`, `slow_cooker` |
| `Difficulty` | `easy`, `medium`, `any` |
| `FoodRules` | wynik silnika reguł: wykluczone/wymagane grupy, alergeny, własne wykluczenia, preferowane, konflikty |

`src/features/products/types.ts` i `src/features/recipes/types.ts` (etap 3):

| Typ | Wartości |
| --- | --- |
| `ProductCategory` | `grains`, `bakery`, `dairy`, `eggs`, `meat`, `fish`, `legumes`, `vegetables`, `fruits`, `nuts_seeds`, `fats_oils`, `spices_condiments`, `other` |
| `BaseUnit` / `QuantityUnit` | `g`, `ml` / `g`, `kg`, `ml`, `l`, `szt` |
| `DataCompleteness` | `complete`, `partial`, `minimal` — **wyliczana** w kodzie, nie przechowywana |
| `Product` | wartości na 100 g/ml (`nutrition` lub `null`), `allergens: AllergenInfo`, `foodGroups`, `source { name, url, isDemo }` |
| `Recipe` | składniki `{ productId, amount, unit }` w stanie surowym, `cookedYieldG` lub `null`, `reliability`, bez pól kcal |
| `RecipeReliability` | `tested`, `estimated`, `unverified` |
| `MealType` | `breakfast`, `lunch`, `dinner`, `snack` |

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

**`user_preferences`** — `user_id` PK, `diet_styles text[] not null` (wartości `DietStyle`,
min. 1), `max_ingredients smallint null check 3–20`, `max_prep_minutes smallint null`,
`difficulty text check in (easy, medium, any)`, `use_leftovers boolean`, `kitchen_equipment text[]`.
Preferowane produkty: `user_preferred_products` (`user_id`, `product_id null`, `custom_label null`).

**`user_exclusions`** — rozróżnia rodzaj wykluczenia
`id`, `user_id`, `kind text check in (allergy, intolerance, dislike, voluntary)`,
`allergen_code text null references allergens(code)`, `product_id uuid null references products`,
`exclude_traces boolean not null default false` (tylko dla `allergy`),
`custom_label text null`, `check (allergen_code is not null or product_id is not null or custom_label is not null)`.

**`user_stores`** — `user_id`, `store_id` FK, PK złożony.

**`pantry_items`** (zapasy) — `user_id`, `product_id`, `quantity_g`, `expires_on date null`.

### Katalog publiczny (etap 3 — zaimplementowane w migracji `20261026140000_catalog.sql`)

**`allergens`** — 14 alergenów UE (rozp. 1169/2011, zał. II), wstawiane w migracji:
`code text` PK (`gluten`, `crustaceans`, `eggs`, `fish`, `peanuts`, `soybeans`, `milk`, `nuts`,
`celery`, `mustard`, `sesame`, `sulphites`, `lupin`, `molluscs`), `name_pl`, `sort_order` unikalny.

**`products`** — `id uuid` PK, `slug text unique` (identyfikator z kodu, `^[a-z0-9-]+$`),
`name` (2–120 znaków), `brand null`, `category text check in (…ProductCategory)`,
`base_unit text check in (g, ml)`, `package_size numeric(10,2) null > 0`,
`grams_per_piece numeric(8,2) null > 0`, `density_g_per_ml numeric(5,3) null` (0,2–3),
`ingredients_text null`, `ingredients_known boolean default false` (false = skład nieznany;
`check (not ingredients_known or ingredients_text is not null)`),
`food_groups text[] default '{}'` (podzbiór `FoodGroup`, indeks GIN), `source_name not null`,
`source_url null`, `is_demo boolean default false`, `created_at`, `updated_at` (trigger
`set_updated_at`). Indeks na `category`. **Kompletność danych nie jest kolumną** — liczy ją
`dataCompleteness()` w kodzie, żeby nie rozjechała się z danymi.

**`product_nutrition`** — 1:1 z `products` (`product_id` PK, cascade). Wartości na 100 jednostek
bazowych produktu (100 g lub 100 ml wg `base_unit`): `kcal numeric(6,1)` 0–900, `protein_g`,
`fat_g`, `carbohydrates_g` `numeric(5,2)` 0–100, `fiber_g null`; `check` suma makro + błonnik
≤ 100,5. **Brak wiersza = brak danych**, nie zera.

**`product_allergens`** — PK (`product_id`, `allergen_code` FK → `allergens`),
`declaration text check in (contains, may_contain)`, indeks na `allergen_code`. Brak wiersza =
**brak wiedzy**, a nie „nie zawiera” — o tym, czy brak deklaracji coś znaczy, decyduje
`products.ingredients_known`; bez znanego składu produkt „wymaga weryfikacji”.

**`recipes`** — `id uuid` PK, `slug unique`, `name`, `description`, `meal_types text[]`
(niepusty podzbiór `MealType`), `servings smallint` 1–20, `prep_minutes` 0–600,
`difficulty check in (easy, medium)`, `equipment text[]` (podzbiór `KitchenEquipment`),
`instructions text[]` niepuste, `cooked_yield_g numeric(8,1) null > 0` (masa po
przygotowaniu), `reliability check in (tested, estimated, unverified)`, `source_name`,
`source_url null`, `is_demo`, `created_at`, `updated_at` (trigger). Kcal/makro/alergeny
**nie są przechowywane** — liczy je kod (`calculateRecipeNutrition`, `evaluateRecipeFit`)
ze składników, bez widoku SQL (jedna implementacja, testowana w Vitest).

**`recipe_ingredients`** — `id uuid` PK, `recipe_id` FK (cascade), `product_id` FK
(`on delete restrict` — nie można usunąć produktu używanego w przepisie), `position` (unikalna
w przepisie), `amount numeric(10,3) > 0` w stanie **surowym**, `unit check in (g, kg, ml, l, szt)`,
`note null`, indeks na `product_id`. Przeliczenie na gramy w kodzie (`toGrams`: `szt` wymaga
`grams_per_piece`, ml↔g wymaga `density_g_per_ml`).

**Dane:** `supabase/seed.sql` (generowany z `demo-products.ts` / `demo-recipes.ts`, wszystkie
rekordy `is_demo = true`). Testy SQL: `supabase/tests/catalog.test.sql`.

### Katalog publiczny (etap 4 — planowane)

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

## Polityki RLS

**Zaimplementowane (etap 3)** dla `allergens`, `products`, `product_nutrition`,
`product_allergens`, `recipes`, `recipe_ingredients`: `enable row level security`, polityka
`<tabela>_public_read` (`for select to anon, authenticated using (true)`), `revoke insert,
update, delete, truncate` od `anon` i `authenticated`. Zapis wyłącznie przez `service_role`
(omija RLS). Sprawdzone testem `supabase/tests/catalog.test.sql` na PostgreSQL 16.

**Docelowo (etapy 4–7):**

| Grupa tabel | SELECT | INSERT/UPDATE/DELETE |
| --- | --- | --- |
| Dane użytkownika (`profiles`, `profile_health_flags`, `user_*`, `pantry_items`, `meal_plans*`, `shopping_lists*`) | `auth.uid() = user_id` | `auth.uid() = user_id` |
| Katalog (`allergens`, `products`, `product_*`, `recipes`, `recipe_ingredients`, `stores`, `store_prices`, `promotions`) | publiczny odczyt (`anon`, `authenticated`) | tylko `service_role` (importy po stronie serwera) |

Tabele podrzędne (np. `meal_plan_items`) sprawdzają własność przez `exists` na tabeli nadrzędnej.
Klucz `service_role` nigdy nie trafia do przeglądarki.
