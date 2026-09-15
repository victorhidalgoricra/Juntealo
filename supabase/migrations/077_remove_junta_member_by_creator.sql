-- Allow a junta creator to remove another active member only while the junta
-- is still being formed. Membership history is preserved as a soft removal.
create or replace function public.remove_junta_member(
  p_junta_id uuid,
  p_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_junta   public.juntas%rowtype;
  v_uid     uuid := auth.uid();
  v_updated int;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  select * into v_junta
  from public.juntas
  where id = p_junta_id
  for update;

  if not found then
    raise exception 'Junta no encontrada';
  end if;

  if v_junta.admin_id <> v_uid then
    raise exception 'Solo el creador puede retirar integrantes';
  end if;

  if v_junta.estado <> 'borrador' then
    raise exception 'No puedes retirar integrantes de una junta que ya inició';
  end if;

  if p_profile_id = v_junta.admin_id then
    raise exception 'El creador no puede retirarse de su propia junta';
  end if;

  update public.junta_members
  set estado  = 'retirado',
      left_at = now()
  where junta_id   = p_junta_id
    and profile_id = p_profile_id
    and estado     = 'activo';

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'El integrante no pertenece activamente a esta junta';
  end if;
end;
$$;

revoke all on function public.remove_junta_member(uuid, uuid) from public;
grant execute on function public.remove_junta_member(uuid, uuid) to authenticated;
