-- Testy migracji cen (constrainty + RLS). Uruchomienie po migracjach i seedzie:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/pricing.test.sql
-- Każdy blok rzuca wyjątek przy niepowodzeniu. Transakcja jest wycofywana na końcu.

begin;

do $$
begin
  assert (select count(*) from public.stores) = 9, 'powinno być 9 sieci z konfiguracji';
  assert (select count(*) from public.store_prices) > 0, 'seed powinien zawierać ceny demo';
  assert (select bool_and(is_demo and source_kind = 'demo') from public.store_prices), 'ceny w seedzie są wyłącznie demo';
  assert (select bool_and(is_demo) from public.promotions), 'promocje w seedzie są wyłącznie demo';
  assert (select count(*) from public.store_prices where is_estimate) > 0, 'seed zawiera ceny szacunkowe';
end;
$$;

-- Constrainty: błędne dane są odrzucane przez bazę.
do $$
declare
  rice uuid := (select id from public.products where slug = 'ryz-bialy');
begin
  begin
    insert into public.store_prices (product_id, store_id, price, package_amount, package_unit, observed_on, source_kind, source_name)
    values (rice, 'lidl', 0, 1, 'kg', current_date, 'manual', 'test');
    raise exception 'FAIL: cena 0 zł powinna być odrzucona';
  exception when check_violation then null;
  end;

  begin
    insert into public.store_prices (product_id, store_id, price, currency, package_amount, package_unit, observed_on, source_kind, source_name)
    values (rice, 'lidl', 4.99, 'EUR', 1, 'kg', current_date, 'manual', 'test');
    raise exception 'FAIL: waluta inna niż PLN powinna być odrzucona';
  exception when check_violation then null;
  end;

  begin
    insert into public.store_prices (product_id, store_id, price, package_amount, package_unit, observed_on, source_kind, source_name)
    values (rice, 'lidl', 4.99, 1, 'opak', current_date, 'manual', 'test');
    raise exception 'FAIL: nieznana jednostka powinna być odrzucona';
  exception when check_violation then null;
  end;

  begin
    insert into public.store_prices (product_id, store_id, price, package_amount, package_unit, observed_on, source_kind, source_name, is_demo)
    values (rice, 'lidl', 4.99, 1, 'kg', current_date, 'manual', 'test', true);
    raise exception 'FAIL: is_demo musi odpowiadać źródłu demo';
  exception when check_violation then null;
  end;

  begin
    insert into public.store_prices (product_id, store_id, price, package_amount, package_unit, observed_on, source_kind, source_name)
    values (rice, 'zabka', 4.99, 1, 'kg', current_date, 'manual', 'test');
    raise exception 'FAIL: sklep spoza listy powinien być odrzucony';
  exception when foreign_key_violation then null;
  end;

  insert into public.store_prices (product_id, store_id, price, package_amount, package_unit, observed_on, source_kind, source_name)
  values (rice, 'netto', 4.99, 1, 'kg', '2026-10-20', 'manual', 'test');
  begin
    insert into public.store_prices (product_id, store_id, price, package_amount, package_unit, observed_on, source_kind, source_name)
    values (rice, 'netto', 5.49, 1, 'kg', '2026-10-20', 'manual', 'test');
    raise exception 'FAIL: powtórzona obserwacja ceny powinna być odrzucona';
  exception when unique_violation then null;
  end;

  begin
    insert into public.promotions (product_id, store_id, promo_price, package_amount, package_unit, starts_on, ends_on, source_kind, source_name)
    values (rice, 'lidl', 3.99, 1, 'kg', '2026-10-20', '2026-10-10', 'manual', 'test');
    raise exception 'FAIL: koniec promocji przed początkiem powinien być odrzucony';
  exception when check_violation then null;
  end;

  begin
    delete from public.stores where id = 'lidl';
    raise exception 'FAIL: nie można usunąć sklepu z cenami';
  exception when foreign_key_violation then null;
  end;
end;
$$;

-- RLS: anon i authenticated czytają ceny, ale nie mogą ich zmieniać.
set local role anon;

do $$
begin
  assert (select count(*) from public.stores) = 9, 'anon powinien czytać sklepy';
  assert (select count(*) from public.store_prices) > 0, 'anon powinien czytać ceny';
  assert (select count(*) from public.promotions) > 0, 'anon powinien czytać promocje';

  begin
    update public.store_prices set price = 0.01;
    raise exception 'FAIL: anon nie może zmieniać cen';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.stores (id, name, sort_order) values ('anon-sklep', 'Anon', 99);
    raise exception 'FAIL: anon nie może dodawać sklepów';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
set local role authenticated;

do $$
begin
  begin
    delete from public.promotions;
    raise exception 'FAIL: authenticated nie może usuwać promocji';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.store_prices (product_id, store_id, price, package_amount, package_unit, observed_on, source_kind, source_name)
    values ((select id from public.products limit 1), 'lidl', 1, 1, 'kg', current_date, 'manual', 'fałszywa');
    raise exception 'FAIL: authenticated nie może dodawać cen do katalogu publicznego';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;

select 'pricing tests: OK' as result;

rollback;
