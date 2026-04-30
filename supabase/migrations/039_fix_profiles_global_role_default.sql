-- Fix profiles.global_role: set default 'user', backfill NULLs, add check constraint,
-- and update the auto-create trigger to explicitly set the default.

-- 1. Backfill existing NULL values
update public.profiles
set global_role = 'user'
where global_role is null;

-- 2. Set column default so future inserts without an explicit value get 'user'
alter table public.profiles
  alter column global_role set default 'user';

-- 3. Add check constraint (idempotent guard)
alter table public.profiles
  drop constraint if exists profiles_global_role_check;

alter table public.profiles
  add constraint profiles_global_role_check
  check (global_role in ('user', 'backoffice_admin', 'admin'));

-- 4. Recreate trigger function to explicitly set global_role = 'user'
--    Belt-and-suspenders: the DEFAULT already covers this, but being explicit
--    guards against future schema changes or upserts that omit the column.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, celular, email, global_role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'phone', '000000000'),
    new.email,
    'user'
  )
  on conflict (id) do update
    set email  = excluded.email,
        nombre = coalesce(public.profiles.nombre, excluded.nombre);
  -- global_role is intentionally NOT updated on conflict to avoid overwriting elevated roles.

  return new;
end;
$$;
