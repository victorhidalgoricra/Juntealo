-- Allows the current round's receiver (or the junta admin) to approve or reject
-- payment submissions made by other members.
--
-- WHY: The "payments approve by admin" RLS policy (migration 001) only permits
-- the junta creator to UPDATE payments. Non-admin receivers cannot approve
-- payments because the direct UPDATE silently affects 0 rows (RLS filters the
-- target row out, Supabase returns no error), making the UI appear broken.
--
-- This SECURITY DEFINER function bypasses RLS and enforces server-side that
-- only the active receiver of the current round (or the admin) can act.

-- Drop previous text-signature overload before redefining with enum parameter.
drop function if exists public.approve_payment_by_receiver(uuid, text);

create or replace function public.approve_payment_by_receiver(
  p_payment_id  uuid,
  p_new_estado  public.payment_estado
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid           uuid := auth.uid();
  v_payment       record;
  v_current_round int;
  v_receiver      uuid;
  v_is_admin      boolean;
  v_now           timestamptz := now();
  v_payment_status text;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  if p_new_estado::text not in ('aprobado', 'rechazado') then
    raise exception 'Estado inválido: %', p_new_estado;
  end if;

  select id, junta_id, estado
  into v_payment
  from public.payments
  where id = p_payment_id;

  if not found then
    raise exception 'Pago no encontrado: %', p_payment_id;
  end if;

  if v_payment.estado::text = 'aprobado' then
    raise exception 'No se puede modificar un pago ya aprobado.';
  end if;

  -- Current round = completed payouts + 1
  select count(*)::int + 1
  into v_current_round
  from public.payouts
  where junta_id = v_payment.junta_id;

  -- Current receiver: member whose turn matches the current round
  select profile_id
  into v_receiver
  from public.junta_members
  where junta_id = v_payment.junta_id
    and estado = 'activo'
    and orden_turno = v_current_round
  limit 1;

  -- Admin check
  select exists(
    select 1 from public.juntas
    where id = v_payment.junta_id and admin_id = v_uid
  ) into v_is_admin;

  if not v_is_admin and (v_receiver is null or v_receiver <> v_uid) then
    raise exception 'Solo el receptor del turno actual o el administrador puede aprobar o rechazar pagos.';
  end if;

  v_payment_status := case p_new_estado::text
    when 'aprobado'  then 'approved'
    when 'rechazado' then 'rejected'
  end;

  update public.payments
  set
    estado         = p_new_estado,
    payment_status = v_payment_status,
    validated_at   = v_now,
    validated_by   = v_uid
  where id = p_payment_id;
end;
$$;

grant execute on function public.approve_payment_by_receiver(uuid, public.payment_estado) to authenticated;
