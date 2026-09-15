-- A participant may leave while the junta is still being assembled, but not
-- after activation, when payment schedules and turns are already in progress.
create or replace function public.leave_junta(p_junta_id uuid)
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

  select * into v_junta from public.juntas where id = p_junta_id;
  if not found then
    raise exception 'Junta no encontrada';
  end if;

  if v_junta.estado in ('activa', 'cerrada') then
    raise exception 'No puedes retirarte de una junta que ya inició.';
  end if;

  if v_junta.admin_id = v_uid then
    raise exception 'El creador no puede retirarse de su propia junta.';
  end if;

  update public.junta_members
  set estado  = 'retirado',
      left_at = now()
  where junta_id   = p_junta_id
    and profile_id = v_uid
    and estado     = 'activo';

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'No eres miembro activo de esta junta';
  end if;
end;
$$;

revoke all on function public.leave_junta(uuid) from public;
grant execute on function public.leave_junta(uuid) to authenticated;
