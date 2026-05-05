-- Allows the current receiver to confirm receipt and advance the junta to the
-- next round. Replaces the direct INSERT into payouts (blocked by RLS for
-- non-admin receivers via "payouts manage by admin" policy from migration 001).
--
-- What this function does:
--   1. Derives the current round number from the count of existing payouts
--      (no caller-supplied round number that could be manipulated).
--   2. Validates the caller is the current receiver (or junta admin).
--   3. Validates server-side that all non-receiver payments are approved.
--   4. Inserts the payout record.
--   5. Marks the current payment_schedule as 'pagada'.
--   6. Returns JSON with payout id, current round, next round, and next receiver.

create or replace function public.confirm_round_receipt(
  p_junta_id uuid,
  p_amount   numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid           uuid := auth.uid();
  v_current_round int;
  v_receiver      uuid;
  v_is_admin      boolean;
  v_schedule_id   uuid;
  v_next_round    int;
  v_next_receiver uuid;
  v_payout_id     uuid;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  -- Derive current round from completed payouts (immutable, cannot be spoofed)
  select count(*)::int + 1
  into v_current_round
  from public.payouts
  where junta_id = p_junta_id;

  -- Current receiver
  select profile_id
  into v_receiver
  from public.junta_members
  where junta_id = p_junta_id
    and estado = 'activo'
    and orden_turno = v_current_round
  limit 1;

  -- Admin check
  select exists(
    select 1 from public.juntas
    where id = p_junta_id and admin_id = v_uid
  ) into v_is_admin;

  if not v_is_admin and (v_receiver is null or v_receiver <> v_uid) then
    raise exception 'Solo el receptor del turno actual puede confirmar el recibo.';
  end if;

  -- Find schedule for the current round
  select id
  into v_schedule_id
  from public.payment_schedules
  where junta_id = p_junta_id
    and cuota_numero = v_current_round
  limit 1;

  -- Server-side guard: every non-receiver active member must have an approved payment
  if v_schedule_id is not null and exists (
    select 1
    from public.junta_members jm
    where jm.junta_id = p_junta_id
      and jm.estado = 'activo'
      and jm.profile_id <> v_uid
      and not exists (
        select 1
        from public.payments py
        where py.junta_id  = p_junta_id
          and py.profile_id = jm.profile_id
          and py.schedule_id = v_schedule_id
          and py.estado = 'aprobado'
      )
  ) then
    raise exception 'Hay pagos pendientes de aprobar antes de confirmar el recibo.';
  end if;

  -- Insert payout
  insert into public.payouts (junta_id, ronda_numero, profile_id, monto_pozo, entregado_en)
  values (p_junta_id, v_current_round, v_uid, p_amount, now())
  returning id into v_payout_id;

  -- Mark current schedule as paid
  if v_schedule_id is not null then
    update public.payment_schedules
    set estado = 'pagada'
    where id = v_schedule_id;
  end if;

  -- Next round info
  v_next_round := v_current_round + 1;

  select profile_id
  into v_next_receiver
  from public.junta_members
  where junta_id = p_junta_id
    and estado = 'activo'
    and orden_turno = v_next_round
  limit 1;

  return jsonb_build_object(
    'payout_id',     v_payout_id,
    'round_number',  v_current_round,
    'next_round',    v_next_round,
    'next_receiver', v_next_receiver
  );
end;
$$;

grant execute on function public.confirm_round_receipt(uuid, numeric) to authenticated;
