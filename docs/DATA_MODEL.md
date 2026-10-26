# Model danych

> **Stan obecny (koniec etapu 5):** istnieją migracje katalogu publicznego
> (`20261026140000_catalog.sql`) i cen (`20261026150000_pricing.sql`). Aplikacja jeszcze **nie
> łączy się** z bazą: katalog i ceny demo czyta z kodu przez interfejsy dostawców, a
> `supabase/seed.sql` jest generowany z tych samych danych. Plany i zapasy (etap 5) istnieją
> tylko w karcie przeglądarki — tabele planów powstaną razem z kontami (etap 7). Pozostałe
> tabele to schemat docelowy (etapy 6–7). Typy domenowe w kodzie
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

### Ceny i sklepy (etap 4 — zaimplementowane w migracji `20261026150000_pricing.sql`)

**`stores`** — `id text` PK (`^[a-z0-9-]+$`, np. `lidl`), `name` (2–60 znaków),
`kind check in (chain, other)` (domyślnie `chain`), `sort_order smallint unique`,
`is_active boolean default true`. Migracja wstawia 9 sieci (Lidl, Biedronka, Kaufland, Aldi,
Carrefour, Auchan, Dino, Netto, Stokrotka) — zgodność z `src/features/stores/stores.ts`
pilnuje test Vitest. Własne sklepy użytkownika (`inny-<slug>`) są na razie tylko w karcie
przeglądarki; w bazie — etap 7.

**`store_prices`** — oddzielone od wartości odżywczych. `id uuid` PK, `product_id` FK
(cascade), `store_id` FK (`on delete restrict`), `price numeric(10,2)` (> 0, ≤ 10 000),
`currency char(3) default 'PLN' check (= 'PLN')`, `package_amount numeric(10,3) > 0`,
`package_unit check in (g, kg, ml, l, szt)`, `observed_on date` (data pozyskania ceny),
`is_estimate boolean default false`, `source_kind check in (demo, csv_import, manual,
provider)`, `source_name` (≥ 2 znaki), `source_url null` (`^https?://`), `is_demo`,
`created_at`. `check (is_demo = (source_kind = 'demo'))`; unikalna obserwacja
(`product_id`, `store_id`, `package_amount`, `package_unit`, `observed_on`, `is_estimate`).
Indeksy (`product_id`, `store_id`, `observed_on desc`) i (`store_id`). **Status aktualności
nie jest kolumną** — liczy go `priceStatus()` przy odczycie (aktualna ≤ 14 dni, potem
nieaktualna; szacunkowa zawsze szacunkowa).

**`promotions`** — `id uuid` PK, `product_id`, `store_id`, `promo_price numeric(10,2)`
(> 0, ≤ 10 000), `currency` (PLN), `package_amount`, `package_unit`, `starts_on`, `ends_on`
(`check (ends_on >= starts_on)`), `conditions text null` (2–200 znaków; promocje z warunkami
nie są wliczane automatycznie), `source_kind`, `source_name`, `source_url`, `is_demo`
(jak wyżej), `created_at`. **Brak kolumny `is_estimate`** — promocja jest zawsze
potwierdzona. Indeks (`product_id`, `store_id`, `ends_on desc`). Status (aktywna /
nadchodząca / wygasła) liczony przy odczycie.

W kodzie kwoty są liczbami całkowitymi w **groszach**; `numeric(10,2)` tylko w bazie.
Ceny z importu CSV użytkownika nie trafiają do katalogu publicznego — w etapie 7 osobna tabela
z `user_id` i RLS właściciela. Seed zawiera 25 produktów, 19 przepisów, 60 cen i 3 promocje demo (`is_demo = true`).
Testy SQL: `supabase/tests/pricing.test.sql`.

### Plany, zapasy i zakupy (planowane — etap 7, z kontami)

W etapie 5 plan **nie jest zapisywany** (decyzja D35): w `sessionStorage` jest tylko
`tk:draft:plan` = `{ startDate, generatedOn, fingerprint }`, a `tk:draft:pantry` to lista
`{ productId, amount, unit }`. Schemat docelowy odpowiada typom z `features/meal-planning`:

**`meal_plans`** — `id`, `user_id`, `start_date date`, `priced_on date`, `target_kcal`,
`target_protein_g`, `target_fat_g`, `target_carbohydrates_g`, `meals_per_day smallint 2–6`,
`budget_pln null`, `status text` (`ok` / `warnings` / `over_budget`), `generator_version text`,
`warnings jsonb`, koszty `used_*_pln` / `packages_*_pln` / `basket_*_pln` osobno dla statusów
`current` / `stale` / `estimated` (bez danych zdrowotnych — tylko cele liczbowe).

**`meal_plan_items`** — `id`, `meal_plan_id` FK cascade, `day smallint 1–7`, `slot text`
(`breakfast`, `second_breakfast`, `lunch`, `afternoon_snack`, `dinner`, `evening_snack`),
`recipe_id`, `portion_factor numeric` (0,5–2 porcji przepisu), `leftover_of_item_id null`,
wyliczone `kcal`, `protein_g`, `fat_g`, `carbohydrates_g`, `ingredients_cost_pln`.

**`pantry_items`** — `id`, `user_id`, `product_id`, `amount numeric > 0`, `unit text`,
`updated_at`; unikalne (`user_id`, `product_id`).

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

**Zaimplementowane (etap 4)** dla `stores`, `store_prices`, `promotions` — te same zasady
(publiczny odczyt, zapis tylko `service_role`), test `supabase/tests/pricing.test.sql`.

**Docelowo (etapy 4–7):**

| Grupa tabel | SELECT | INSERT/UPDATE/DELETE |
| --- | --- | --- |
| Dane użytkownika (`profiles`, `profile_health_flags`, `user_*`, `pantry_items`, `meal_plans*`, `shopping_lists*`) | `auth.uid() = user_id` | `auth.uid() = user_id` |
| Katalog (`allergens`, `products`, `product_*`, `recipes`, `recipe_ingredients`, `stores`, `store_prices`, `promotions`) | publiczny odczyt (`anon`, `authenticated`) | tylko `service_role` (importy po stronie serwera) |

Tabele podrzędne (np. `meal_plan_items`) sprawdzają własność przez `exists` na tabeli nadrzędnej.
Klucz `service_role` nigdy nie trafia do przeglądarki.
