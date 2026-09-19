-- Idempotent backfill. Only timestamps explicitly present in operational data are used.

select public.record_product_event(
  'user_registered', 'user_registered:' || p.id, p.id,
  p_source := 'database_trigger',
  p_metadata := jsonb_build_object(
    'acquisition_source', case when r.id is null then 'unknown' else 'referral' end,
    'referral_code_present', r.id is not null,
    'registration_channel', 'unknown'
  ), p_occurred_at := p.created_at
)
from public.profiles p left join public.referrals r on r.referred_id = p.id;

select public.record_product_event(
  'junta_created', 'junta_created:' || j.id, j.admin_id, j.id,
  p_source := 'database_trigger',
  p_metadata := jsonb_build_object(
    'visibility', j.visibilidad::text, 'frequency', j.frecuencia_pago::text,
    'participant_capacity', j.participantes_max, 'currency', j.moneda,
    'amount', j.monto_cuota, 'creation_source', 'unknown'
  ), p_occurred_at := j.created_at
)
from public.juntas j;

select public.record_product_event(
  'junta_joined', 'junta_joined:' || jm.junta_id || ':' || jm.profile_id,
  jm.profile_id, jm.junta_id, p_source := 'database_trigger',
  p_metadata := jsonb_build_object('join_source', 'unknown'), p_occurred_at := jm.created_at
)
from public.junta_members jm join public.juntas j on j.id = jm.junta_id
where jm.profile_id <> j.admin_id and jm.estado::text in ('activo','moroso','retirado');

with first_members as (
  select distinct on (jm.junta_id) jm.junta_id, jm.profile_id, jm.created_at
  from public.junta_members jm join public.juntas j on j.id = jm.junta_id
  where jm.profile_id <> j.admin_id and jm.estado::text in ('activo','moroso','retirado')
  order by jm.junta_id, jm.created_at, jm.id
)
select public.record_product_event(
  'junta_first_member_joined', 'junta_first_member_joined:' || f.junta_id,
  f.profile_id, f.junta_id, p_source := 'database_trigger',
  p_metadata := '{}'::jsonb, p_occurred_at := f.created_at
)
from first_members f;

update public.juntas j set first_member_joined_at = f.created_at
from (
  select jm.junta_id, min(jm.created_at) as created_at
  from public.junta_members jm join public.juntas x on x.id = jm.junta_id
  where jm.profile_id <> x.admin_id and jm.estado::text in ('activo','moroso','retirado') group by jm.junta_id
) f where f.junta_id = j.id and j.first_member_joined_at is null;

select public.record_product_event(
  'payment_submitted', 'payment_submitted:' || p.id, p.profile_id, p.junta_id,
  p.id, p.schedule_id, p_source := 'database_trigger',
  p_metadata := jsonb_build_object(
    'expected_amount', coalesce(p.expected_amount, p.monto),
    'submitted_amount', coalesce(p.submitted_amount, p.monto)
  ), p_occurred_at := coalesce(p.submitted_at, p.pagado_en, p.created_at)
)
from public.payments p;

select public.record_product_event(
  'payment_confirmed', 'payment_confirmed:' || p.id, p.profile_id, p.junta_id,
  p.id, p.schedule_id, p_source := 'database_trigger',
  p_metadata := jsonb_build_object(
    'expected_amount', coalesce(p.expected_amount, p.monto),
    'confirmed_amount', coalesce(p.submitted_amount, p.monto),
    'due_date', ps.fecha_vencimiento,
    'payment_date', coalesce(p.submitted_at, p.pagado_en),
    'is_on_time', coalesce(p.submitted_at, p.pagado_en) < ps.fecha_vencimiento::timestamptz + interval '1 day',
    'hours_late', greatest(extract(epoch from (coalesce(p.submitted_at, p.pagado_en)
      - (ps.fecha_vencimiento::timestamptz + interval '1 day'))) / 3600.0, 0),
    'receiver_user_id', receiver.profile_id
  ), p_occurred_at := coalesce(p.validated_at, p.submitted_at, p.pagado_en, p.created_at)
)
from public.payments p
join public.payment_schedules ps on ps.id = p.schedule_id
left join public.junta_members receiver on receiver.junta_id = p.junta_id
  and receiver.orden_turno = ps.cuota_numero and receiver.estado::text <> 'retirado'
where p.payment_status = 'approved' or p.estado::text = 'aprobado';

select public.record_product_event(
  'payment_rejected', 'payment_rejected:' || p.id, p.profile_id, p.junta_id,
  p.id, p.schedule_id, p_source := 'database_trigger',
  p_metadata := jsonb_build_object('reason_code', 'validation_rejected'),
  p_occurred_at := coalesce(p.validated_at, p.created_at)
)
from public.payments p where p.payment_status = 'rejected' or p.estado::text = 'rechazado';

select public.record_product_event(
  'payout_completed', 'payout_completed:' || po.id, po.profile_id, po.junta_id,
  p_cycle_id := ps.id, p_source := 'database_trigger',
  p_metadata := jsonb_build_object(
    'expected_amount', ps.monto * greatest(j.participantes_max - 1, 0),
    'actual_amount', po.monto_pozo
  ), p_occurred_at := po.entregado_en
)
from public.payouts po join public.juntas j on j.id = po.junta_id
left join public.payment_schedules ps on ps.junta_id = po.junta_id and ps.cuota_numero = po.ronda_numero
where po.entregado_en is not null;

select public.record_product_event(
  'cycle_completed', 'cycle_completed:' || ps.id, po.profile_id, po.junta_id,
  p_cycle_id := ps.id, p_source := 'database_trigger',
  p_metadata := jsonb_build_object('cycle_number', po.ronda_numero),
  p_occurred_at := po.entregado_en
)
from public.payouts po join public.payment_schedules ps
  on ps.junta_id = po.junta_id and ps.cuota_numero = po.ronda_numero
where po.entregado_en is not null;

select public.record_product_event(
  'junta_completed', 'junta_completed:' || j.id, j.admin_id, j.id,
  p_source := 'database_trigger',
  p_metadata := jsonb_build_object(
    'cycles_completed', count(po.id), 'total_volume', coalesce(sum(po.monto_pozo), 0),
    'participant_count', (select count(*) from public.junta_members jm
      where jm.junta_id = j.id and jm.estado::text in ('activo','moroso'))
  ), p_occurred_at := max(po.entregado_en)
)
from public.juntas j join public.payouts po on po.junta_id = j.id and po.entregado_en is not null
where j.estado::text = 'cerrada'
group by j.id;

update public.juntas j set completed_at = x.completed_at
from (select junta_id, max(entregado_en) completed_at from public.payouts
  where entregado_en is not null group by junta_id) x
where x.junta_id = j.id and j.estado::text = 'cerrada' and j.completed_at is null;

select public.record_product_event(
  'junta_invite_created', 'junta_invite_created:' || i.id, i.enviado_por, i.junta_id,
  p_invite_id := i.id, p_source := 'database_trigger',
  p_metadata := jsonb_build_object('invitation_channel', case when i.email is not null then 'email' else 'mobile' end),
  p_occurred_at := i.created_at
)
from public.invitations i;

select public.record_product_event(
  'payment_reminder_sent', 'payment_reminder_sent:' || n.id, n.created_by, n.junta_id,
  p_notification_id := n.id, p_source := 'notification',
  p_metadata := jsonb_build_object(
    'recipient_user_id', n.profile_id,
    'channel', case when n.email_status <> 'not_requested' then 'in_app_and_email' else 'in_app' end,
    'reminder_sequence', row_number() over(partition by n.junta_id, n.profile_id order by n.created_at, n.id)
  ), p_occurred_at := n.created_at
)
from public.notifications n where n.tipo = 'payment-reminder';

-- Remove legacy rows that contain free-form junta names or obsolete event names.
delete from public.user_activity_events where event_type = 'joined_junta';
update public.user_activity_events set metadata = metadata - 'junta_name'
where metadata ? 'junta_name';
