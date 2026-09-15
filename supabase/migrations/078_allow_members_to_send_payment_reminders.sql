create or replace function public.send_payment_reminder(p_junta_id uuid, p_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_junta public.juntas%rowtype;
  v_round integer;
  v_schedule public.payment_schedules%rowtype;
  v_receiver_id uuid;
begin
  if auth.uid() is null then
    raise exception 'No autorizado';
  end if;

  select * into v_junta from public.juntas where id = p_junta_id;
  if not found or v_junta.estado <> 'activa' or coalesce(v_junta.bloqueada, false) then
    raise exception 'La junta no está disponible para enviar recordatorios';
  end if;

  if not exists (
    select 1 from public.junta_members jm
    where jm.junta_id = p_junta_id and jm.profile_id = auth.uid() and jm.estado <> 'retirado'
  ) then
    raise exception 'No tienes permisos para enviar este recordatorio';
  end if;

  if p_profile_id = auth.uid() then
    raise exception 'No puedes enviarte un recordatorio a ti mismo';
  end if;

  select count(*)::integer + 1 into v_round
  from public.payouts where junta_id = p_junta_id;

  select jm.profile_id into v_receiver_id
  from public.junta_members jm
  where jm.junta_id = p_junta_id and jm.orden_turno = v_round and jm.estado <> 'retirado'
  limit 1;

  if p_profile_id = v_receiver_id or not exists (
    select 1 from public.junta_members jm
    where jm.junta_id = p_junta_id and jm.profile_id = p_profile_id and jm.estado <> 'retirado'
  ) then
    raise exception 'El destinatario no tiene un pago pendiente en esta ronda';
  end if;

  select * into v_schedule from public.payment_schedules
  where junta_id = p_junta_id and cuota_numero = v_round
  order by fecha_vencimiento limit 1;

  if v_schedule.id is null or exists (
    select 1 from public.payments p
    where p.junta_id = p_junta_id and p.schedule_id = v_schedule.id and p.profile_id = p_profile_id
      and coalesce(p.payment_status::text, p.estado::text) in ('approved', 'aprobado', 'pagado', 'submitted', 'validating', 'validando', 'pendiente_aprobacion')
  ) then
    raise exception 'El destinatario no tiene un pago pendiente en esta ronda';
  end if;

  if exists (
    select 1 from public.notifications n
    where n.junta_id = p_junta_id and n.profile_id = p_profile_id and n.tipo = 'payment-reminder'
      and n.created_at > now() - interval '5 minutes'
  ) then
    raise exception 'Ya se envió un recordatorio recientemente';
  end if;

  insert into public.notifications (profile_id, junta_id, titulo, mensaje, tipo)
  values (
    p_profile_id,
    p_junta_id,
    'Pago pendiente en ' || v_junta.nombre,
    'Recuerda realizar tu aporte de S/ ' || trim(to_char(coalesce(v_junta.cuota_base, v_junta.monto_cuota), 'FM999999990.00')) ||
      ' antes del ' || to_char(v_schedule.fecha_vencimiento, 'DD/MM/YYYY') || '.',
    'payment-reminder'
  );

  return jsonb_build_object('sent', true);
end;
$$;

revoke all on function public.send_payment_reminder(uuid, uuid) from public;
grant execute on function public.send_payment_reminder(uuid, uuid) to authenticated;
