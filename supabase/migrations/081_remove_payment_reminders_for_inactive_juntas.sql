-- Payment reminders are actionable only while their junta is active.
-- Remove stale rows left by earlier administrative soft-deletes.
delete from public.notifications n
where n.tipo = 'payment-reminder'
  and (
    n.junta_id is null
    or not exists (
      select 1
      from public.juntas j
      where j.id = n.junta_id
        and j.estado = 'activa'
        and not coalesce(j.bloqueada, false)
        and j.deleted_at is null
    )
  );

-- Administrative deletion is implemented as a block. Clear existing payment
-- reminders in the same transaction so users no longer see an invalid action.
create or replace function public.admin_soft_delete_junta(p_junta_id uuid)
returns public.juntas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_junta public.juntas%rowtype;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  if not public.admin_is_backoffice(v_uid) then
    raise exception 'No autorizado';
  end if;

  select * into v_junta from public.juntas where id = p_junta_id;
  if not found then
    raise exception 'Junta no encontrada';
  end if;

  if not coalesce(v_junta.bloqueada, false) then
    update public.juntas
    set
      bloqueada = true,
      cerrar_inscripciones = true
    where id = p_junta_id
    returning * into v_junta;
  end if;

  delete from public.notifications
  where junta_id = p_junta_id
    and tipo = 'payment-reminder';

  return v_junta;
end;
$$;

revoke all on function public.admin_soft_delete_junta(uuid) from public;
grant execute on function public.admin_soft_delete_junta(uuid) to authenticated;
