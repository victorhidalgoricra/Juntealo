drop function if exists public.get_public_profiles_for_ranking();

create or replace function public.get_public_profiles_for_ranking()
returns table (
  id uuid,
  nombre text,
  first_name text,
  second_name text,
  paternal_last_name text,
  foto_url text,
  profile_created_at timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.nombre,
    p.first_name,
    p.second_name,
    p.paternal_last_name,
    p.foto_url,
    p.created_at as profile_created_at,
    p.created_at
  from public.profiles p
  order by p.created_at asc, p.id asc;
$$;

grant execute on function public.get_public_profiles_for_ranking() to authenticated;
