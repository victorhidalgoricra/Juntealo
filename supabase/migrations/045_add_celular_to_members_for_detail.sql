-- Extend get_junta_members_for_detail to also return celular from profiles.
-- Required for WhatsApp reminder functionality in the junta detail view.

create or replace function public.get_junta_members_for_detail(p_junta_id uuid)
returns table (
  id uuid,
  junta_id uuid,
  profile_id uuid,
  estado public.member_estado,
  rol text,
  orden_turno int,
  created_at timestamptz,
  nombre text,
  celular text
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
    p.nombre,
    p.celular
  from public.junta_members jm
  join public.profiles p on p.id = jm.profile_id
  where jm.junta_id = p_junta_id
    and jm.estado = 'activo'
  order by jm.orden_turno asc nulls last, jm.created_at asc;
end;
$$;

revoke all on function public.get_junta_members_for_detail(uuid) from public;
grant execute on function public.get_junta_members_for_detail(uuid) to authenticated;
