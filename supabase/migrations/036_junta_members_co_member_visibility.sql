-- Fix RLS: allow any active member (or owner) to see all members of a junta.
-- Previous policy "junta_members_select_owner_or_self" (017) only allows self or owner.
-- Non-owner members can't see co-members, breaking the turn-assignment UI.
-- Also fix profiles visibility so co-members can see each other's names.

-- Helper: check if auth.uid() is an active member of a junta (bypasses RLS to avoid recursion)
create or replace function public.uid_is_active_member_of(_junta_id uuid)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.junta_members jm
    where jm.junta_id = _junta_id
      and jm.profile_id = auth.uid()
      and jm.estado = 'activo'
  );
$$;

-- Replace the overly restrictive SELECT policy with one that allows co-member visibility
drop policy if exists "junta_members_select_owner_or_self" on public.junta_members;
drop policy if exists "members visible in own junta" on public.junta_members;
drop policy if exists "junta members read visible" on public.junta_members;

create policy "junta_members_select_co_member_or_owner" on public.junta_members
for select
using (
  -- Always see your own row
  profile_id = auth.uid()
  -- Owner can see all members (non-recursive: checks juntas table, not junta_members)
  or exists (
    select 1 from public.juntas j
    where j.id = junta_members.junta_id
      and j.admin_id = auth.uid()
  )
  -- Any active member can see all co-members (non-recursive via security definer)
  or public.uid_is_active_member_of(junta_members.junta_id)
);

-- SECURITY DEFINER function: returns all active members with profile names for a junta.
-- Caller must be the admin or an active member of the junta.
create or replace function public.get_junta_members_for_detail(p_junta_id uuid)
returns table (
  id uuid,
  junta_id uuid,
  profile_id uuid,
  estado public.member_estado,
  rol text,
  orden_turno int,
  created_at timestamptz,
  nombre text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    exists (
      select 1 from public.juntas j
      where j.id = p_junta_id
        and j.admin_id = auth.uid()
    )
    or exists (
      select 1 from public.junta_members jm
      where jm.junta_id = p_junta_id
        and jm.profile_id = auth.uid()
        and jm.estado = 'activo'
    )
  ) then
    raise exception 'No autorizado para ver los miembros de esta junta';
  end if;

  return query
  select
    jm.id,
    jm.junta_id,
    jm.profile_id,
    jm.estado,
    jm.rol,
    jm.orden_turno,
    jm.created_at,
    p.nombre
  from public.junta_members jm
  join public.profiles p on p.id = jm.profile_id
  where jm.junta_id = p_junta_id
    and jm.estado = 'activo'
  order by jm.orden_turno asc nulls last, jm.created_at asc;
end;
$$;

revoke all on function public.get_junta_members_for_detail(uuid) from public;
grant execute on function public.get_junta_members_for_detail(uuid) to authenticated;
