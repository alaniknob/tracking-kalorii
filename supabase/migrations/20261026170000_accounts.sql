-- Etap 7: konta, trwałość danych użytkownika, RLS właściciela, usuwanie konta.
-- Katalog publiczny (etapy 3–4) pozostaje tylko do odczytu. Dane użytkownika NIE trafiają
-- do tabel katalogu.
--
-- Ten plik NIE tworzy nic w schema auth (SQL Editor na hoście nie ma do tego uprawnień;
-- auth.users i auth.uid() już są w projekcie Supabase). Szkielet auth.* na lokalny
-- Postgres: supabase/local-auth-stub.sql (tylko npm run test:sql — nie wklejać na hoście).

-- ---------------------------------------------------------------- profile

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  birth_date date not null,
  height_cm numeric(5, 1) not null check (height_cm between 120 and 230),
  weight_kg numeric(5, 1) not null check (weight_kg between 35 and 300),
  target_weight_kg numeric(5, 1) check (target_weight_kg is null or target_weight_kg between 35 and 300),
  sex text not null default 'unspecified' check (sex in ('female', 'male', 'unspecified')),
  activity_level text not null check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal text not null check (goal in ('lose_weight', 'maintain', 'gain_weight', 'build_muscle')),
  meals_per_day smallint not null check (meals_per_day between 2 and 6),
  weekly_budget_pln numeric(10, 2) check (weekly_budget_pln is null or weekly_budget_pln > 0),
  allow_estimates boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.profile_health_flags (
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  flag text not null check (flag in (
    'pregnancy', 'breastfeeding', 'diabetes', 'kidney_disease',
    'cardiovascular_disease', 'eating_disorder', 'other_condition'
  )),
  primary key (user_id, flag)
);

-- ---------------------------------------------------------------- preferencje i wykluczenia

create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  diet_styles text[] not null check (
    diet_styles <> '{}'
    and diet_styles <@ array['traditional', 'vegetarian', 'vegan', 'meatless', 'with_fish', 'no_fish', 'with_meat']::text[]
  ),
  max_ingredients smallint check (max_ingredients is null or max_ingredients between 3 and 20),
  max_prep_minutes smallint check (max_prep_minutes is null or max_prep_minutes between 5 and 180),
  difficulty text not null default 'any' check (difficulty in ('easy', 'medium', 'any')),
  use_leftovers boolean not null default true,
  kitchen_equipment text[] not null default '{}'
    check (kitchen_equipment <@ array['stove', 'oven', 'microwave', 'blender', 'air_fryer', 'slow_cooker']::text[]),
  updated_at timestamptz not null default now()
);

create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

create table public.user_preferred_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_preferences (user_id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  custom_label text check (custom_label is null or char_length(custom_label) between 2 and 80),
  check (product_id is not null or custom_label is not null)
);

create index user_preferred_products_user_idx on public.user_preferred_products (user_id);

create table public.user_exclusions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('allergy', 'intolerance', 'dislike', 'voluntary')),
  allergen_code text references public.allergens (code) on delete restrict,
  product_id uuid references public.products (id) on delete set null,
  exclude_traces boolean not null default false,
  custom_label text check (custom_label is null or char_length(custom_label) between 2 and 80),
  check (allergen_code is not null or product_id is not null or custom_label is not null),
  check (kind <> 'allergy' or exclude_traces in (true, false))
);

create index user_exclusions_user_idx on public.user_exclusions (user_id);

-- ---------------------------------------------------------------- sklepy użytkownika i zapasy

create table public.user_stores (
  user_id uuid not null references auth.users (id) on delete cascade,
  store_id text not null references public.stores (id) on delete restrict,
  primary key (user_id, store_id)
);

create table public.user_custom_stores (
  user_id uuid not null references auth.users (id) on delete cascade,
  store_id text not null check (store_id ~ '^inny-[a-z0-9-]+$'),
  name text not null check (char_length(name) between 2 and 40),
  primary key (user_id, store_id)
);

create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  amount numeric(12, 3) not null check (amount > 0),
  unit text not null check (unit in ('g', 'kg', 'ml', 'l', 'szt')),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index pantry_items_user_idx on public.pantry_items (user_id);

create trigger pantry_items_set_updated_at
  before update on public.pantry_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- import cen użytkownika (nie katalog publiczny)

create table public.user_price_imports (
  user_id uuid primary key references auth.users (id) on delete cascade,
  file_name text not null check (char_length(file_name) between 1 and 200),
  csv_text text not null check (char_length(csv_text) between 1 and 200000),
  imported_at timestamptz not null default now()
);

create table public.user_store_prices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  store_id text not null check (store_id ~ '^[a-z0-9-]+$'),
  price numeric(10, 2) not null check (price > 0 and price <= 10000),
  currency char(3) not null default 'PLN' check (currency = 'PLN'),
  package_amount numeric(10, 3) not null check (package_amount > 0),
  package_unit text not null check (package_unit in ('g', 'kg', 'ml', 'l', 'szt')),
  observed_on date not null,
  is_estimate boolean not null default false,
  source_name text not null check (char_length(source_name) >= 2),
  created_at timestamptz not null default now()
);

create index user_store_prices_user_idx on public.user_store_prices (user_id);

create table public.user_promotions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  store_id text not null check (store_id ~ '^[a-z0-9-]+$'),
  promo_price numeric(10, 2) not null check (promo_price > 0 and promo_price <= 10000),
  currency char(3) not null default 'PLN' check (currency = 'PLN'),
  package_amount numeric(10, 3) not null check (package_amount > 0),
  package_unit text not null check (package_unit in ('g', 'kg', 'ml', 'l', 'szt')),
  starts_on date not null,
  ends_on date not null,
  conditions text,
  source_name text not null check (char_length(source_name) >= 2),
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create index user_promotions_user_idx on public.user_promotions (user_id);

-- ---------------------------------------------------------------- wersje robocze (ten sam kształt co sessionStorage — hydratacja po zalogowaniu)

create table public.user_drafts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  profile_json jsonb,
  diet_json jsonb,
  restrictions_json jsonb,
  stores_json jsonb,
  budget_json jsonb,
  pantry_json jsonb,
  price_import_json jsonb,
  shopping_checked_json jsonb,
  current_plan_id uuid,
  updated_at timestamptz not null default now()
);

create trigger user_drafts_set_updated_at
  before update on public.user_drafts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- plany i zakupy

create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  start_date date not null,
  priced_on date not null,
  target_kcal integer not null check (target_kcal > 0),
  target_protein_g numeric(6, 1) not null,
  target_fat_g numeric(6, 1) not null,
  target_carbohydrates_g numeric(6, 1) not null,
  meals_per_day smallint not null check (meals_per_day between 2 and 6),
  budget_pln numeric(10, 2),
  status text not null check (status in ('ok', 'warnings', 'over_budget')),
  generator_version text not null,
  settings_fingerprint text not null check (settings_fingerprint ~ '^[0-9a-f]{64}$'),
  warnings jsonb not null default '[]'::jsonb,
  used_current_pln numeric(10, 2) not null default 0,
  used_stale_pln numeric(10, 2) not null default 0,
  used_estimated_pln numeric(10, 2) not null default 0,
  packages_current_pln numeric(10, 2) not null default 0,
  packages_stale_pln numeric(10, 2) not null default 0,
  packages_estimated_pln numeric(10, 2) not null default 0,
  basket_current_pln numeric(10, 2) not null default 0,
  basket_stale_pln numeric(10, 2) not null default 0,
  basket_estimated_pln numeric(10, 2) not null default 0,
  assignment jsonb not null,
  created_at timestamptz not null default now()
);

create index meal_plans_user_idx on public.meal_plans (user_id, created_at desc);

alter table public.user_drafts
  add constraint user_drafts_current_plan_fk
  foreign key (current_plan_id) references public.meal_plans (id) on delete set null;

create table public.meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references public.meal_plans (id) on delete cascade,
  position smallint not null check (position >= 0),
  day smallint not null check (day between 0 and 6),
  slot text not null check (slot in (
    'breakfast', 'second_breakfast', 'lunch', 'afternoon_snack', 'dinner', 'evening_snack'
  )),
  recipe_slug text not null check (recipe_slug ~ '^[a-z0-9-]+$'),
  recipe_id uuid references public.recipes (id) on delete set null,
  portion_factor numeric(3, 2) not null check (portion_factor between 0.5 and 2),
  leftover_of_position smallint,
  kcal numeric(8, 1) not null,
  protein_g numeric(6, 1) not null,
  fat_g numeric(6, 1) not null,
  carbohydrates_g numeric(6, 1) not null,
  unique (meal_plan_id, position)
);

create index meal_plan_items_plan_idx on public.meal_plan_items (meal_plan_id);

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  meal_plan_id uuid not null references public.meal_plans (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (meal_plan_id)
);

create index shopping_lists_user_idx on public.shopping_lists (user_id);

create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  shopping_list_id uuid not null references public.shopping_lists (id) on delete cascade,
  product_slug text not null check (product_slug ~ '^[a-z0-9-]+$'),
  product_id uuid references public.products (id) on delete set null,
  store_id text check (store_id is null or store_id ~ '^[a-z0-9-]+$'),
  quantity_g numeric(12, 3),
  packages smallint check (packages is null or packages >= 0),
  package_price_pln numeric(10, 2),
  price_status text,
  in_pantry boolean not null default false,
  checked boolean not null default false,
  checked_signature text,
  unique (shopping_list_id, product_slug)
);

create index shopping_list_items_list_idx on public.shopping_list_items (shopping_list_id);

-- ---------------------------------------------------------------- usuwanie własnego konta (bez klucza service_role w aplikacji)

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

-- ---------------------------------------------------------------- RLS: tylko właściciel

do $$
declare
  t text;
  owner_tables text[] := array[
    'profiles', 'profile_health_flags', 'user_preferences', 'user_preferred_products',
    'user_exclusions', 'user_stores', 'user_custom_stores', 'pantry_items',
    'user_price_imports', 'user_store_prices', 'user_promotions', 'user_drafts',
    'meal_plans', 'shopping_lists'
  ];
begin
  foreach t in array owner_tables
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, public', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t || '_owner',
      t
    );
  end loop;
end;
$$;

alter table public.meal_plan_items enable row level security;
revoke all on public.meal_plan_items from anon, public;
grant select, insert, update, delete on public.meal_plan_items to authenticated;

create policy meal_plan_items_owner on public.meal_plan_items
  for all to authenticated
  using (exists (select 1 from public.meal_plans p where p.id = meal_plan_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.meal_plans p where p.id = meal_plan_id and p.user_id = auth.uid()));

alter table public.shopping_list_items enable row level security;
revoke all on public.shopping_list_items from anon, public;
grant select, insert, update, delete on public.shopping_list_items to authenticated;

create policy shopping_list_items_owner on public.shopping_list_items
  for all to authenticated
  using (exists (select 1 from public.shopping_lists s where s.id = shopping_list_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.shopping_lists s where s.id = shopping_list_id and s.user_id = auth.uid()));
