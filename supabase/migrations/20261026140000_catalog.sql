-- Etap 3: katalog publiczny — alergeny UE, produkty, wartości odżywcze, przepisy.
-- Wartości słownikowe zgodne z typami w src/features/{allergens,preferences,products,recipes}.
-- Kcal/makro/alergeny przepisów NIE są przechowywane — liczy je kod ze składników.
-- RLS: publiczny odczyt; zapis wyłącznie przez service_role (omija RLS, tylko po stronie serwera).

-- ---------------------------------------------------------------- pomocnicze

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- alergeny (rozp. UE 1169/2011, zał. II)

create table public.allergens (
  code text primary key check (code ~ '^[a-z_]+$'),
  name_pl text not null,
  sort_order smallint not null unique
);

insert into public.allergens (code, name_pl, sort_order) values
  ('gluten', 'Zboża zawierające gluten', 1),
  ('crustaceans', 'Skorupiaki', 2),
  ('eggs', 'Jaja', 3),
  ('fish', 'Ryby', 4),
  ('peanuts', 'Orzeszki ziemne (arachidowe)', 5),
  ('soybeans', 'Soja', 6),
  ('milk', 'Mleko (w tym laktoza)', 7),
  ('nuts', 'Orzechy', 8),
  ('celery', 'Seler', 9),
  ('mustard', 'Gorczyca', 10),
  ('sesame', 'Nasiona sezamu', 11),
  ('sulphites', 'Dwutlenek siarki i siarczyny', 12),
  ('lupin', 'Łubin', 13),
  ('molluscs', 'Mięczaki', 14);

-- ---------------------------------------------------------------- produkty

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 2 and 120),
  brand text check (brand is null or char_length(brand) between 1 and 80),
  category text not null check (category in (
    'grains', 'bakery', 'dairy', 'eggs', 'meat', 'fish', 'legumes', 'vegetables',
    'fruits', 'nuts_seeds', 'fats_oils', 'spices_condiments', 'other'
  )),
  base_unit text not null check (base_unit in ('g', 'ml')),
  package_size numeric(10, 2) check (package_size is null or package_size > 0),
  grams_per_piece numeric(8, 2) check (grams_per_piece is null or grams_per_piece > 0),
  density_g_per_ml numeric(5, 3) check (density_g_per_ml is null or density_g_per_ml between 0.2 and 3),
  ingredients_text text,
  -- false = skład nieznany → produkt nigdy nie jest uznawany za wolny od alergenów
  ingredients_known boolean not null default false,
  food_groups text[] not null default '{}'
    check (food_groups <@ array['meat', 'fish', 'seafood', 'eggs', 'dairy', 'honey']::text[]),
  source_name text not null check (char_length(source_name) >= 2),
  source_url text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_ingredients_known_requires_text
    check (not ingredients_known or ingredients_text is not null)
);

create index products_category_idx on public.products (category);
create index products_food_groups_idx on public.products using gin (food_groups);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- Wartości odżywcze oddzielone od produktu (brak wiersza = brak danych, nie zera).
create table public.product_nutrition (
  product_id uuid primary key references public.products (id) on delete cascade,
  kcal numeric(6, 1) not null check (kcal between 0 and 900),
  protein_g numeric(5, 2) not null check (protein_g between 0 and 100),
  fat_g numeric(5, 2) not null check (fat_g between 0 and 100),
  carbohydrates_g numeric(5, 2) not null check (carbohydrates_g between 0 and 100),
  fiber_g numeric(5, 2) check (fiber_g is null or fiber_g between 0 and 100),
  constraint product_nutrition_macro_sum
    check (protein_g + fat_g + carbohydrates_g + coalesce(fiber_g, 0) <= 100.5)
);

-- Zadeklarowane alergeny. Brak wiersza = BRAK WIEDZY, nie „nie zawiera”.
create table public.product_allergens (
  product_id uuid not null references public.products (id) on delete cascade,
  allergen_code text not null references public.allergens (code),
  declaration text not null check (declaration in ('contains', 'may_contain')),
  primary key (product_id, allergen_code)
);

create index product_allergens_allergen_idx on public.product_allergens (allergen_code);

-- ---------------------------------------------------------------- przepisy

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 2 and 160),
  description text not null default '',
  meal_types text[] not null
    check (cardinality(meal_types) > 0 and meal_types <@ array['breakfast', 'lunch', 'dinner', 'snack']::text[]),
  servings smallint not null check (servings between 1 and 20),
  prep_minutes smallint not null check (prep_minutes between 0 and 600),
  difficulty text not null check (difficulty in ('easy', 'medium')),
  equipment text[] not null default '{}'
    check (equipment <@ array['stove', 'oven', 'microwave', 'blender', 'air_fryer', 'slow_cooker']::text[]),
  instructions text[] not null check (cardinality(instructions) > 0),
  -- masa gotowej potrawy (po obróbce); ilości składników są zawsze w stanie surowym
  cooked_yield_g numeric(8, 1) check (cooked_yield_g is null or cooked_yield_g > 0),
  reliability text not null check (reliability in ('tested', 'estimated', 'unverified')),
  source_name text not null check (char_length(source_name) >= 2),
  source_url text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger recipes_set_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  position smallint not null check (position >= 0),
  amount numeric(10, 3) not null check (amount > 0),
  unit text not null check (unit in ('g', 'kg', 'ml', 'l', 'szt')),
  note text,
  unique (recipe_id, position)
);

create index recipe_ingredients_product_idx on public.recipe_ingredients (product_id);

-- ---------------------------------------------------------------- RLS: katalog publiczny tylko do odczytu

do $$
declare
  t text;
begin
  foreach t in array array['allergens', 'products', 'product_nutrition', 'product_allergens', 'recipes', 'recipe_ingredients']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t || '_public_read', t);
    execute format('revoke insert, update, delete, truncate on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to anon, authenticated', t);
  end loop;
end;
$$;
