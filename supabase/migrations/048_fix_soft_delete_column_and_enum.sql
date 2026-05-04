-- Fix delete_junta_with_dependencies soft delete:
-- Migration 047 referenced deleted_at (column didn't exist) and estado='eliminada'
-- (value wasn't in the enum). The function was created but failed at runtime.
-- This migration adds both prerequisites and delivers the correct function.

-- 1. Add deleted_at to juntas (nullable soft-delete timestamp)
alter table public.juntas
  add column if not exists deleted_at timestamptz;

-- 2. Add 'eliminada' to junta_estado enum
alter type public.junta_estado add value if not exists 'eliminada';

-- 3. Correct delete_junta_with_dependencies:
--    - Uses deleted_at + estado='eliminada' (soft delete, no hard delete of juntas row)
--    - fecha_inicio guard uses strict < to match frontend canDeleteJunta logic
--    - Adds updated_at = now()
create or replace function public.delete_junta_with_dependencies(p_junta_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_junta public.juntas%rowtype;
begin
  if p_user_id is null then
    raise exception 'No autenticado';
  end if;

  select * into v_junta
  from public.juntas
  where id = p_junta_id;

  if not found then
    raise exception 'Junta no encontrada';
  end if;

  if v_junta.admin_id <> p_user_id then
    raise exception 'Solo el creador puede eliminar esta junta.';
  end if;

  if v_junta.estado <> 'borrador' then
    raise exception 'Solo puedes eliminar una junta en estado borrador.';
  end if;

  if coalesce(v_junta.bloqueada, false) then
    raise exception 'Esta junta fue bloqueada por el administrador.';
  end if;

  if v_junta.deleted_at is not null then
    raise exception 'Esta junta ya fue eliminada.';
  end if;

  if v_junta.fecha_inicio is not null and v_junta.fecha_inicio < current_date then
    raise exception 'No puedes eliminar una junta que ya inició.';
  end if;

  delete from public.audit_logs       where junta_id = p_junta_id;
  delete from public.notifications    where junta_id = p_junta_id;
  delete from public.invitations      where junta_id = p_junta_id;
  delete from public.payouts          where junta_id = p_junta_id;
  delete from public.payments         where junta_id = p_junta_id;
  delete from public.payment_schedules where junta_id = p_junta_id;
  delete from public.junta_members    where junta_id = p_junta_id;

  update public.juntas
  set
    deleted_at = now(),
    estado     = 'eliminada',
    updated_at = now()
  where id = p_junta_id;
end;
$$;

revoke all on function public.delete_junta_with_dependencies(uuid, uuid) from public;
grant execute on function public.delete_junta_with_dependencies(uuid, uuid) to authenticated;
