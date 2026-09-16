alter table public.notifications
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists email_status text not null default 'not_requested'
    check (email_status in ('not_requested', 'pending', 'sent', 'delivered', 'delayed', 'bounced', 'complained', 'failed')),
  add column if not exists email_provider_id text,
  add column if not exists email_error text,
  add column if not exists email_sent_at timestamptz;

create index if not exists idx_notifications_profile_created_at
  on public.notifications(profile_id, created_at desc);

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
  v_recipient public.profiles%rowtype;
  v_notification_id uuid;
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;

  select * into v_junta from public.juntas where id = p_junta_id;
  if not found or v_junta.estado <> 'activa' or coalesce(v_junta.bloqueada, false) then
    raise exception 'La junta no está disponible para enviar recordatorios';
  end if;

  if not exists (
    select 1 from public.junta_members
    where junta_id = p_junta_id and profile_id = auth.uid() and estado <> 'retirado'
  ) then raise exception 'No tienes permisos para enviar este recordatorio'; end if;

  if p_profile_id = auth.uid() then raise exception 'No puedes enviarte un recordatorio a ti mismo'; end if;

  select count(*)::integer + 1 into v_round from public.payouts where junta_id = p_junta_id;
  select profile_id into v_receiver_id from public.junta_members
    where junta_id = p_junta_id and orden_turno = v_round and estado <> 'retirado' limit 1;

  if p_profile_id = v_receiver_id or not exists (
    select 1 from public.junta_members
    where junta_id = p_junta_id and profile_id = p_profile_id and estado <> 'retirado'
  ) then raise exception 'El destinatario no tiene un pago pendiente en esta ronda'; end if;

  select * into v_schedule from public.payment_schedules
    where junta_id = p_junta_id and cuota_numero = v_round order by fecha_vencimiento limit 1;

  if v_schedule.id is null or exists (
    select 1 from public.payments p
    where p.junta_id = p_junta_id and p.schedule_id = v_schedule.id and p.profile_id = p_profile_id
      and coalesce(p.payment_status::text, p.estado::text) in
        ('approved', 'aprobado', 'pagado', 'submitted', 'validating', 'validando', 'pendiente_aprobacion')
  ) then raise exception 'El destinatario no tiene un pago pendiente en esta ronda'; end if;

  if exists (
    select 1 from public.notifications n
    where n.junta_id = p_junta_id and n.profile_id = p_profile_id and n.tipo = 'payment-reminder'
      and n.created_at > now() - interval '5 minutes'
  ) then raise exception 'Ya se envió un recordatorio recientemente'; end if;

  select * into v_recipient from public.profiles where id = p_profile_id;
  if v_recipient.id is null then raise exception 'No se encontró el perfil del destinatario'; end if;

  insert into public.notifications
    (profile_id, junta_id, titulo, mensaje, tipo, created_by, email_status)
  values (
    p_profile_id, p_junta_id, 'Pago pendiente en ' || v_junta.nombre,
    'Recuerda realizar tu aporte de S/ ' || trim(to_char(v_schedule.monto, 'FM999999990.00')) ||
      ' antes del ' || to_char(v_schedule.fecha_vencimiento, 'DD/MM/YYYY') || '.',
    'payment-reminder', auth.uid(), 'pending'
  ) returning id into v_notification_id;

  return jsonb_build_object(
    'notification_id', v_notification_id,
    'recipient_email', v_recipient.email,
    'recipient_name', v_recipient.nombre,
    'junta_name', v_junta.nombre,
    'amount', v_schedule.monto,
    'due_date', v_schedule.fecha_vencimiento,
    'schedule_id', v_schedule.id
  );
end;
$$;

create or replace function public.set_payment_reminder_email_result(
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
  where id = p_notification_id and created_by = auth.uid() and tipo = 'payment-reminder';

  if not found then raise exception 'No se encontró el recordatorio'; end if;
end;
$$;

revoke all on function public.send_payment_reminder(uuid, uuid) from public;
grant execute on function public.send_payment_reminder(uuid, uuid) to authenticated;
revoke all on function public.set_payment_reminder_email_result(uuid, text, text, text) from public;
grant execute on function public.set_payment_reminder_email_result(uuid, text, text, text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
