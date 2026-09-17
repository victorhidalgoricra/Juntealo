-- Allow a payer to remind the receiver of a specific round to configure a
-- valid payout method. The RPC keeps recipient email private and rate-limits
-- reminders to one per junta, receiver and Lima calendar day.
create or replace function public.send_payout_method_reminder(
  p_junta_id uuid,
  p_schedule_id uuid,
  p_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_junta public.juntas%rowtype;
  v_schedule public.payment_schedules%rowtype;
  v_recipient public.profiles%rowtype;
  v_receiver_id uuid;
  v_notification_id uuid;
  v_is_configured boolean;
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;

  select * into v_junta from public.juntas where id = p_junta_id;
  if not found or v_junta.estado <> 'activa' or coalesce(v_junta.bloqueada, false) then
    raise exception 'La junta no está disponible para enviar recordatorios';
  end if;

  if not exists (
    select 1 from public.junta_members
    where junta_id = p_junta_id and profile_id = auth.uid() and estado = 'activo'
  ) then raise exception 'No tienes permisos para enviar este recordatorio'; end if;

  select * into v_schedule from public.payment_schedules
  where id = p_schedule_id and junta_id = p_junta_id;
  if not found then raise exception 'No se encontró la ronda indicada'; end if;
  if v_schedule.cuota_numero <> (select count(*)::integer + 1 from public.payouts where junta_id = p_junta_id) then
    raise exception 'La ronda indicada no es la ronda actual';
  end if;

  select profile_id into v_receiver_id from public.junta_members
  where junta_id = p_junta_id
    and orden_turno = v_schedule.cuota_numero
    and estado = 'activo'
  limit 1;

  if v_receiver_id is null or p_profile_id <> v_receiver_id then
    raise exception 'El destinatario no es el receptor de esta ronda';
  end if;
  if p_profile_id = auth.uid() then raise exception 'No puedes enviarte un recordatorio a ti mismo'; end if;

  select * into v_recipient from public.profiles where id = p_profile_id;
  if not found then raise exception 'No se encontró el perfil del destinatario'; end if;

  v_is_configured := case v_recipient.preferred_payout_method
    when 'yape' then coalesce(nullif(trim(v_recipient.payout_phone_number), ''), nullif(trim(v_recipient.celular), '')) is not null
    when 'plin' then coalesce(nullif(trim(v_recipient.payout_phone_number), ''), nullif(trim(v_recipient.celular), '')) is not null
    when 'bank_account' then nullif(trim(v_recipient.payout_account_number), '') is not null or nullif(trim(v_recipient.payout_cci), '') is not null
    when 'cash' then true
    when 'other' then nullif(trim(v_recipient.payout_account_name), '') is not null or nullif(trim(v_recipient.payout_notes), '') is not null
    else false
  end;

  if v_is_configured then raise exception 'El receptor ya configuró sus datos de pago'; end if;
  if nullif(trim(v_recipient.email), '') is null then raise exception 'El receptor no tiene un correo registrado'; end if;

  if exists (
    select 1 from public.notifications n
    where n.junta_id = p_junta_id
      and n.profile_id = p_profile_id
      and n.tipo = 'payout-method-reminder'
      and (timezone('America/Lima', n.created_at))::date = (timezone('America/Lima', now()))::date
  ) then raise exception 'Ya se envió el recordatorio de hoy al receptor.'; end if;

  insert into public.notifications
    (profile_id, junta_id, titulo, mensaje, tipo, created_by, email_status)
  values (
    p_profile_id,
    p_junta_id,
    'Configura cómo recibir tus aportes',
    'Te corresponde recibir los aportes de esta ronda en ' || v_junta.nombre ||
      '. Completa tus datos de pago para que los integrantes puedan pagarte.',
    'payout-method-reminder',
    auth.uid(),
    'pending'
  ) returning id into v_notification_id;

  return jsonb_build_object(
    'notification_id', v_notification_id,
    'recipient_email', v_recipient.email,
    'recipient_name', coalesce(nullif(trim(v_recipient.nombre), ''), 'Integrante'),
    'junta_name', v_junta.nombre
  );
end;
$$;

create or replace function public.set_payout_method_reminder_email_result(
  p_notification_id uuid,
  p_status text,
  p_provider_id text default null,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;
  if p_status not in ('sent', 'failed') then raise exception 'Estado de correo inválido'; end if;

  update public.notifications
  set email_status = p_status,
      email_provider_id = p_provider_id,
      email_error = case when p_status = 'failed' then left(p_error, 1000) else null end,
      email_sent_at = case when p_status = 'sent' then now() else null end
  where id = p_notification_id
    and created_by = auth.uid()
    and tipo = 'payout-method-reminder';

  if not found then raise exception 'No se encontró el recordatorio'; end if;
end;
$$;

revoke all on function public.send_payout_method_reminder(uuid, uuid, uuid) from public;
grant execute on function public.send_payout_method_reminder(uuid, uuid, uuid) to authenticated;
revoke all on function public.set_payout_method_reminder_email_result(uuid, text, text, text) from public;
grant execute on function public.set_payout_method_reminder_email_result(uuid, text, text, text) to authenticated;
