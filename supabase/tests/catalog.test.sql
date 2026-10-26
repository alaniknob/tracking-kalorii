-- Testy migracji katalogu (constrainty + RLS). Uruchomienie po `supabase db reset`:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/catalog.test.sql
-- Każdy blok rzuca wyjątek przy niepowodzeniu. Transakcja jest wycofywana na końcu.

begin;

do $$
begin
  assert (select count(*) from public.allergens) = 14, 'powinno być 14 alergenów UE';
  assert (select bool_and(is_demo) from public.products), 'seed zawiera wyłącznie dane demo';
end;
$$;

-- Constrainty: błędne dane są odrzucane przez bazę.
do $$
begin
  begin
    insert into public.products (slug, name, category, base_unit, ingredients_known, source_name)
    values ('zly-produkt', 'Zły produkt', 'grains', 'g', true, 'test');
    raise exception 'FAIL: ingredients_known bez składu powinno być odrzucone';
  exception when check_violation then null;
  end;

  begin
    insert into public.products (slug, name, category, base_unit, food_groups, source_name)
    values ('zla-grupa', 'Zła grupa', 'grains', 'g', array['unicorn'], 'test');
    raise exception 'FAIL: nieznana grupa żywności powinna być odrzucona';
  exception when check_violation then null;
  end;

  begin
    insert into public.product_nutrition (product_id, kcal, protein_g, fat_g, carbohydrates_g)
    values ((select id from public.products order by slug limit 1), 300, 60, 0, 60);
    raise exception 'FAIL: suma makro > 100 g powinna być odrzucona';
  exception when check_violation or unique_violation then null;
  end;

  begin
    insert into public.product_allergens (product_id, allergen_code, declaration)
    values ((select id from public.products order by slug limit 1), 'kiwi', 'contains');
    raise exception 'FAIL: alergen spoza słownika powinien być odrzucony';
  exception when foreign_key_violation then null;
  end;
end;
$$;

-- RLS: anon czyta katalog, ale nie może go zmieniać.
set local role anon;

do $$
begin
  assert (select count(*) from public.products) > 0, 'anon powinien czytać produkty';
  assert (select count(*) from public.recipe_ingredients) > 0, 'anon powinien czytać składniki przepisów';

  begin
    insert into public.products (slug, name, category, base_unit, source_name) values ('anon-insert', 'Anon', 'other', 'g', 'x');
    raise exception 'FAIL: anon nie może dodawać produktów';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.product_nutrition set kcal = 0;
    raise exception 'FAIL: anon nie może zmieniać wartości odżywczych';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
set local role authenticated;

do $$
begin
  assert (select count(*) from public.recipes) > 0, 'zalogowany użytkownik powinien czytać przepisy';
  begin
    delete from public.recipes;
    raise exception 'FAIL: authenticated nie może usuwać przepisów';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;

select 'catalog tests: OK' as result;

rollback;
