-- TYLKO lokalny PostgreSQL (npm run test:sql). NIE wklejaj w SQL Editor na hoście.
-- Hostowany Supabase ma własne auth.users i auth.uid(); rola SQL Editor nie może
-- tworzyć obiektów w schema auth.
--
-- Skrypt testów wgrywa ten plik PRZED migracjami.

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key,
  email text,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'auth'
      and p.proname = 'uid'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    execute $fn$
      create function auth.uid()
      returns uuid
      language sql
      stable
      as $body$
        select coalesce(
          nullif(current_setting('request.jwt.claim.sub', true), ''),
          (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'),
          nullif(current_setting('tk.user_id', true), '')
        )::uuid
      $body$;
    $fn$;
  end if;
end;
$$;

grant usage on schema auth to anon, authenticated, service_role;
