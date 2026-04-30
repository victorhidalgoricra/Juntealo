-- Fix admin_is_backoffice to also check profiles.global_role, mirroring resolveGlobalRole() in TypeScript.
-- Previously it only checked user_global_roles, causing "No autorizado" for users whose role is stored
-- in profiles.global_role without a matching row in user_global_roles.

create or replace function public.admin_is_backoffice(p_profile_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.user_global_roles ugr
      where ugr.profile_id = p_profile_id
        and ugr.role in ('admin', 'backoffice_admin')
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = p_profile_id
        and p.global_role in ('admin', 'backoffice_admin')
    );
$$;

revoke all on function public.admin_is_backoffice(uuid) from public;
grant execute on function public.admin_is_backoffice(uuid) to authenticated;
