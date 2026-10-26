-- Etap 4: sklepy, ceny w sklepach, promocje.
-- Wartości słownikowe zgodne z src/features/{stores,pricing}. Status aktualności ceny
-- (aktualna / nieaktualna / szacunkowa) i promocji (aktywna / wygasła) NIE jest przechowywany —
-- liczy go kod w chwili odczytu (src/features/pricing/freshness.ts).
-- RLS: publiczny odczyt; zapis wyłącznie przez service_role. Ceny z importu użytkownika
-- trafią do osobnej tabeli z user_id w etapie 7 (dane użytkownika ≠ katalog publiczny).

-- ---------------------------------------------------------------- sklepy

create table public.stores (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 2 and 60),
  kind text not null default 'chain' check (kind in ('chain', 'other')),
  sort_order smallint not null unique,
  is_active boolean not null default true
);

-- Konfigurowalna lista sieci (src/features/stores/stores.ts). Nazwa sieci nie oznacza dostępu
-- do jej danych — brak integracji i scrapingu.
insert into public.stores (id, name, kind, sort_order) values
  ('lidl', 'Lidl', 'chain', 1),
  ('biedronka', 'Biedronka', 'chain', 2),
  ('kaufland', 'Kaufland', 'chain', 3),
  ('aldi', 'Aldi', 'chain', 4),
  ('carrefour', 'Carrefour', 'chain', 5),
  ('auchan', 'Auchan', 'chain', 6),
  ('dino', 'Dino', 'chain', 7),
  ('netto', 'Netto', 'chain', 8),
  ('stokrotka', 'Stokrotka', 'chain', 9);

-- ---------------------------------------------------------------- ceny

create table public.store_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  store_id text not null references public.stores (id) on delete restrict,
  price numeric(10, 2) not null check (price > 0 and price <= 10000),
  currency char(3) not null default 'PLN' check (currency = 'PLN'),
  package_amount numeric(10, 3) not null check (package_amount > 0),
  package_unit text not null check (package_unit in ('g', 'kg', 'ml', 'l', 'szt')),
  -- data pozyskania ceny; aktualność liczona od niej przy odczycie
  observed_on date not null,
  -- cena szacunkowa (nie odczytana ze sklepu) — nigdy nie sumowana z potwierdzonymi
  is_estimate boolean not null default false,
  source_kind text not null check (source_kind in ('demo', 'csv_import', 'manual', 'provider')),
  source_name text not null check (char_length(source_name) >= 2),
  source_url text check (source_url is null or source_url ~ '^https?://'),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  constraint store_prices_demo_source check (is_demo = (source_kind = 'demo')),
  constraint store_prices_unique_observation
    unique (product_id, store_id, package_amount, package_unit, observed_on, is_estimate)
);

create index store_prices_lookup_idx on public.store_prices (product_id, store_id, observed_on desc);
create index store_prices_store_idx on public.store_prices (store_id);

-- ---------------------------------------------------------------- promocje

-- Brak kolumny is_estimate: promocje są wyłącznie potwierdzone (zakaz fałszywych promocji).
create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  store_id text not null references public.stores (id) on delete restrict,
  promo_price numeric(10, 2) not null check (promo_price > 0 and promo_price <= 10000),
  currency char(3) not null default 'PLN' check (currency = 'PLN'),
  package_amount numeric(10, 3) not null check (package_amount > 0),
  package_unit text not null check (package_unit in ('g', 'kg', 'ml', 'l', 'szt')),
  starts_on date not null,
  ends_on date not null,
  -- promocje z warunkami (np. „przy zakupie 2 szt.”) nie są wliczane automatycznie
  conditions text check (conditions is null or char_length(conditions) between 2 and 200),
  source_kind text not null check (source_kind in ('demo', 'csv_import', 'manual', 'provider')),
  source_name text not null check (char_length(source_name) >= 2),
  source_url text check (source_url is null or source_url ~ '^https?://'),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  constraint promotions_dates check (ends_on >= starts_on),
  constraint promotions_demo_source check (is_demo = (source_kind = 'demo'))
);

create index promotions_lookup_idx on public.promotions (product_id, store_id, ends_on desc);

-- ---------------------------------------------------------------- RLS: katalog publiczny tylko do odczytu

do $$
declare
  t text;
begin
  foreach t in array array['stores', 'store_prices', 'promotions']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t || '_public_read', t);
    execute format('revoke insert, update, delete, truncate on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to anon, authenticated', t);
  end loop;
end;
$$;
