-- Migration 056: Auto-close junta when the last round receipt is confirmed.
--
-- After inserting the final payout, if v_current_round equals the total number
-- of active members with an assigned turn, the junta is marked 'cerrada'.
-- The response also includes is_last_round and total_rounds so the frontend
-- can react immediately without an extra DB query.

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
  v_uid                uuid := auth.uid();
  v_current_profile_id uuid;
  v_current_round      int;
  v_total_rounds       int;
  v_receiver           uuid;
  v_is_admin           boolean;
  v_schedule_id        uuid;
  v_next_round         int;
  v_next_receiver      uuid;
  v_payout_id          uuid;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  -- Resolve caller's profile_id from profiles table (defensive, mirrors migration 054)
  select id
  into v_current_profile_id
  from public.profiles
  where id = v_uid
     or email = auth.email()
  order by (id = v_uid) desc
  limit 1;

  if v_current_profile_id is null then
    raise exception 'Perfil no encontrado para el usuario autenticado (uid=%).', v_uid;
  end if;

  -- Derive current round from completed payouts (immutable, cannot be spoofed)
  select count(*)::int + 1
  into v_current_round
  from public.payouts
  where junta_id = p_junta_id;

  -- Total rounds = active members with an assigned turn
  select count(*)::int
  into v_total_rounds
  from public.junta_members
  where junta_id = p_junta_id
    and estado = 'activo'
    and orden_turno is not null
    and orden_turno > 0;

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
    where id = p_junta_id and admin_id = v_current_profile_id
  ) into v_is_admin;

  if not v_is_admin and (v_receiver is null or v_receiver <> v_current_profile_id) then
    raise exception 'Solo el receptor del turno actual puede confirmar el recibo. (caller=%, receiver=%, round=%)',
      v_current_profile_id, v_receiver, v_current_round;
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
      and jm.profile_id <> v_current_profile_id
      and not exists (
        select 1
        from public.payments py
        where py.junta_id   = p_junta_id
          and py.profile_id  = jm.profile_id
          and py.schedule_id = v_schedule_id
          and py.estado      = 'aprobado'
      )
  ) then
    raise exception 'Hay pagos pendientes de aprobar antes de confirmar el recibo.';
  end if;

  -- Insert payout
  insert into public.payouts (junta_id, ronda_numero, profile_id, monto_pozo, entregado_en)
  values (p_junta_id, v_current_round, v_current_profile_id, p_amount, now())
  returning id into v_payout_id;

  -- Mark current schedule as paid
  if v_schedule_id is not null then
    update public.payment_schedules
    set estado = 'pagada'
    where id = v_schedule_id;
  end if;

  -- Close the junta when the last round is confirmed
  if v_current_round = v_total_rounds then
    update public.juntas
    set estado = 'cerrada'
    where id = p_junta_id;
  end if;

  -- Next round info (null when last round was just confirmed)
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
    'next_receiver', v_next_receiver,
    'is_last_round', (v_current_round = v_total_rounds),
    'total_rounds',  v_total_rounds
  );
end;
$$;

grant execute on function public.confirm_round_receipt(uuid, numeric) to authenticated;
