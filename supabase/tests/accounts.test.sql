-- Testy migracji kont (constrainty + RLS właściciela). Uruchomienie po migracjach i seedzie:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/accounts.test.sql
-- Transakcja jest wycofywana na końcu.

begin;

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'a@example.com'),
  ('22222222-2222-4222-8222-222222222222', 'b@example.com');

-- Constrainty: błędne dane są odrzucane przez bazę.
do $$
declare
  a uuid := '11111111-1111-4111-8111-111111111111';
begin
  begin
    insert into public.profiles (user_id, birth_date, height_cm, weight_kg, activity_level, goal, meals_per_day)
    values (a, '1990-01-01', 50, 70, 'light', 'maintain', 4);
    raise exception 'FAIL: wzrost 50 cm powinien być odrzucony';
  exception when check_violation then null;
  end;

  begin
    insert into public.profiles (user_id, birth_date, height_cm, weight_kg, activity_level, goal, meals_per_day)
    values (a, '1990-01-01', 170, 70, 'light', 'maintain', 9);
    raise exception 'FAIL: 9 posiłków powinno być odrzucone';
  exception when check_violation then null;
  end;

  insert into public.profiles (
    user_id, birth_date, height_cm, weight_kg, sex, activity_level, goal, meals_per_day, weekly_budget_pln
  ) values (a, '1990-05-10', 172, 70, 'female', 'moderate', 'maintain', 4, 250);

  insert into public.profile_health_flags (user_id, flag) values (a, 'diabetes');

  begin
    insert into public.profile_health_flags (user_id, flag) values (a, 'unicorn');
    raise exception 'FAIL: nieznana flaga zdrowotna powinna być odrzucona';
  exception when check_violation then null;
  end;

  insert into public.user_preferences (user_id, diet_styles, difficulty, use_leftovers, kitchen_equipment)
  values (a, array['vegetarian'], 'easy', true, array['stove']);

  begin
    insert into public.user_exclusions (user_id, kind) values (a, 'allergy');
    raise exception 'FAIL: wykluczenie bez alergenu/produktu/etykiety powinno być odrzucone';
  exception when check_violation then null;
  end;

  insert into public.user_exclusions (user_id, kind, allergen_code, exclude_traces)
  values (a, 'allergy', 'milk', true);

  insert into public.user_stores (user_id, store_id) values (a, 'lidl');
  insert into public.user_custom_stores (user_id, store_id, name) values (a, 'inny-targ', 'Targ');
  insert into public.pantry_items (user_id, product_id, amount, unit)
  values (a, (select id from public.products where slug = 'ryz-bialy'), 500, 'g');
  insert into public.user_price_imports (user_id, file_name, csv_text)
  values (a, 'ceny.csv', 'produkt;sklep;cena');

  insert into public.meal_plans (
    id, user_id, start_date, priced_on, target_kcal, target_protein_g, target_fat_g, target_carbohydrates_g,
    meals_per_day, status, generator_version, settings_fingerprint, assignment
  ) values (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', a, '2026-10-26', '2026-10-26', 1800, 90, 60, 200,
    4, 'ok', '7', repeat('ab', 32), '[{"recipeId":"owsianka-bananowa","factor":1}]'::jsonb
  );

  insert into public.meal_plan_items (
    meal_plan_id, position, day, slot, recipe_slug, recipe_id, portion_factor, kcal, protein_g, fat_g, carbohydrates_g
  ) values (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 0, 0, 'breakfast', 'owsianka-bananowa',
    (select id from public.recipes where slug = 'owsianka-bananowa'), 1, 400, 20, 10, 50
  );

  insert into public.shopping_lists (id, user_id, meal_plan_id)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', a, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

  insert into public.shopping_list_items (shopping_list_id, product_slug, product_id, checked, checked_signature)
  values (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'ryz-bialy',
    (select id from public.products where slug = 'ryz-bialy'), false, 'lidl|1|500'
  );

  insert into public.user_drafts (user_id, current_plan_id, profile_json)
  values (a, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '{"birthDate":"1990-05-10"}'::jsonb);
end;
$$;

-- Anon: katalog tak, dane użytkownika nie.
set local role anon;

do $$
begin
  assert (select count(*) from public.products) > 0, 'anon powinien czytać katalog';

  begin
    perform 1 from public.profiles;
    raise exception 'FAIL: anon nie powinien mieć SELECT na profiles';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.user_exclusions (user_id, kind, custom_label)
    values ('11111111-1111-4111-8111-111111111111', 'voluntary', 'test');
    raise exception 'FAIL: anon nie może dodawać wykluczeń';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;

-- Użytkownik A widzi tylko swoje dane.
select set_config('tk.user_id', '11111111-1111-4111-8111-111111111111', true);
set local role authenticated;

do $$
begin
  assert (select count(*) from public.profiles) = 1, 'A powinien widzieć swój profil';
  assert (select count(*) from public.user_exclusions) = 1, 'A powinien widzieć swoje wykluczenia';
  assert (select count(*) from public.meal_plans) = 1, 'A powinien widzieć swój plan';
  assert (select count(*) from public.meal_plan_items) = 1, 'A powinien widzieć pozycje własnego planu';
  assert (select count(*) from public.shopping_list_items) = 1, 'A powinien widzieć swoją listę';
  assert (select count(*) from public.products) > 0, 'zalogowany nadal czyta katalog';

  begin
    insert into public.profiles (user_id, birth_date, height_cm, weight_kg, activity_level, goal, meals_per_day)
    values ('22222222-2222-4222-8222-222222222222', '1988-02-02', 180, 80, 'active', 'maintain', 3);
    raise exception 'FAIL: A nie może wstawić profilu B';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm like 'FAIL:%' then raise; end if;
      if sqlerrm not ilike '%row-level security%' then raise; end if;
  end;
end;
$$;

reset role;

-- Użytkownik B nie widzi nic z konta A i może utworzyć własne.
select set_config('tk.user_id', '22222222-2222-4222-8222-222222222222', true);
set local role authenticated;

do $$
begin
  assert (select count(*) from public.profiles) = 0, 'B nie powinien widzieć profilu A';
  assert (select count(*) from public.meal_plans) = 0, 'B nie powinien widzieć planu A';
  assert (select count(*) from public.meal_plan_items) = 0, 'B nie powinien widzieć pozycji planu A';
  assert (select count(*) from public.user_exclusions) = 0, 'B nie powinien widzieć wykluczeń A';
  assert (select count(*) from public.shopping_lists) = 0, 'B nie powinien widzieć listy A';
  assert (select count(*) from public.user_price_imports) = 0, 'B nie powinien widzieć importu A';
  assert (select count(*) from public.pantry_items) = 0, 'B nie powinien widzieć zapasów A';

  insert into public.profiles (user_id, birth_date, height_cm, weight_kg, activity_level, goal, meals_per_day)
  values ('22222222-2222-4222-8222-222222222222', '1988-02-02', 180, 80, 'active', 'maintain', 3);

  assert (select count(*) from public.profiles) = 1, 'B widzi tylko swój profil';
  assert (select birth_date from public.profiles) = date '1988-02-02', 'B czyta własną datę urodzenia';

  update public.profiles set height_cm = 190 where user_id = '11111111-1111-4111-8111-111111111111';
  assert found = false, 'B nie może zmieniać profilu A';

  delete from public.meal_plans where user_id = '11111111-1111-4111-8111-111111111111';
  assert found = false, 'B nie może usuwać planu A';
end;
$$;

reset role;

-- Usunięcie konta kasuje dane (ON DELETE CASCADE).
select set_config('tk.user_id', '11111111-1111-4111-8111-111111111111', true);
set local role authenticated;
select public.delete_own_account();
reset role;
select set_config('tk.user_id', '', true);

do $$
begin
  assert (select count(*) from auth.users where id = '11111111-1111-4111-8111-111111111111') = 0, 'konto A powinno zniknąć';
  assert (select count(*) from public.profiles where user_id = '11111111-1111-4111-8111-111111111111') = 0, 'profil A powinien zniknąć';
  assert (select count(*) from public.meal_plans where user_id = '11111111-1111-4111-8111-111111111111') = 0, 'plany A powinny zniknąć';
  assert (select count(*) from public.user_exclusions where user_id = '11111111-1111-4111-8111-111111111111') = 0, 'wykluczenia A powinny zniknąć';
  assert (select count(*) from public.shopping_lists where user_id = '11111111-1111-4111-8111-111111111111') = 0, 'listy A powinny zniknąć';
  assert (select count(*) from auth.users where id = '22222222-2222-4222-8222-222222222222') = 1, 'konto B zostaje';
end;
$$;

select 'accounts tests: OK' as result;

rollback;
