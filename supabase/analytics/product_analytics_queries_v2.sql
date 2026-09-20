-- Product analytics V2: read-only queries using explicit lifecycle events.
-- Run numbered blocks individually; do not apply this file with db push.

-- 01_activation_funnel_v2.csv
-- Creation cohort: every later stage is evaluated only for juntas created in that month.
with cohort as (
  select junta_id, min(occurred_at) created_at
  from public.user_activity_events
  where event_type='junta_created' and junta_id is not null
  group by junta_id
), progress as (
  select c.*,
    exists(select 1 from public.user_activity_events e where e.junta_id=c.junta_id and e.event_type='junta_first_member_joined' and e.occurred_at>=c.created_at) has_first_member,
    exists(select 1 from public.user_activity_events e where e.junta_id=c.junta_id and e.event_type='junta_filled' and e.occurred_at>=c.created_at) has_filled,
    exists(select 1 from public.user_activity_events e where e.junta_id=c.junta_id and e.event_type='junta_activated' and e.occurred_at>=c.created_at) has_activated,
    exists(select 1 from public.user_activity_events e where e.junta_id=c.junta_id and e.event_type='payment_confirmed' and e.occurred_at>=c.created_at) has_payment,
    exists(select 1 from public.user_activity_events e where e.junta_id=c.junta_id and e.event_type='junta_completed' and e.occurred_at>=c.created_at) has_completed
  from cohort c
), monthly as (
  select date_trunc('month',created_at)::date period_month, count(*) juntas_created,
    count(*) filter(where has_first_member) juntas_with_first_member,
    count(*) filter(where has_filled) juntas_filled,
    count(*) filter(where has_activated) juntas_activated,
    count(*) filter(where has_payment) juntas_with_payment,
    count(*) filter(where has_completed) juntas_completed
  from progress group by 1
)
select *,
  round(100.0*juntas_with_first_member/nullif(juntas_created,0),2) first_member_rate,
  round(100.0*juntas_filled/nullif(juntas_created,0),2) fill_rate,
  round(100.0*juntas_activated/nullif(juntas_created,0),2) activation_rate,
  round(100.0*juntas_with_payment/nullif(juntas_created,0),2) first_payment_rate,
  round(100.0*juntas_completed/nullif(juntas_created,0),2) completion_rate
from monthly order by period_month;

-- 02_junta_liquidity_v2.csv
select j.id junta_id, j.created_at, j.first_member_joined_at, j.first_filled_at,
  j.activated_at, j.completed_at, j.participantes_max,
  count(jm.id) filter(where jm.estado::text in ('activo','moroso')) current_participants,
  round(count(jm.id) filter(where jm.estado::text in ('activo','moroso'))::numeric
    / nullif(j.participantes_max,0),4) current_fill_rate,
  extract(epoch from (j.first_member_joined_at-j.created_at))/3600.0 hours_to_first_member,
  extract(epoch from (j.first_filled_at-j.created_at))/3600.0 hours_to_fill,
  extract(epoch from (j.activated_at-j.first_filled_at))/3600.0 hours_fill_to_activation,
  extract(epoch from (j.activated_at-j.created_at))/3600.0 hours_to_activation
from public.juntas j left join public.junta_members jm on jm.junta_id=j.id
group by j.id order by j.created_at;

-- 03_repeat_and_retention_v2.csv
-- Sequential repeat: a different junta joined strictly after a completed junta.
with completed as (
  select jm.profile_id user_id, e.junta_id, e.occurred_at completed_at
  from public.user_activity_events e join public.junta_members jm on jm.junta_id=e.junta_id
  where e.event_type='junta_completed' and jm.estado::text in ('activo','moroso')
), eligible as (
  select distinct on (user_id) user_id, junta_id completed_junta_id, completed_at
  from completed order by user_id, completed_at, junta_id
)
select e.*,
  n.next_junta_after_completion,
  extract(epoch from (n.next_junta_after_completion-e.completed_at))/86400.0 days_to_next_junta
from eligible e left join lateral (
  select min(j.occurred_at) next_junta_after_completion
  from public.user_activity_events j
  where j.event_type='junta_joined' and j.profile_id=e.user_id
    and j.junta_id<>e.completed_junta_id and j.occurred_at>e.completed_at
) n on true order by e.completed_at;

-- 04_virality_v2.csv
-- Cohort is the month the invite link was created. One open is one unique
-- invite/browser pair. K = links per inviter * new registered users per link.
with invite_facts as (
  select i.id invite_id,i.enviado_por inviter_user_id,
    date_trunc('month',i.created_at)::date period_month,
    count(distinct a.anonymous_visitor_id) unique_opens,
    count(distinct a.registered_user_id) attributed_registrations,
    count(distinct a.registered_user_id) filter(where a.joined_at is not null) attributed_joins
  from public.invitations i left join public.junta_invite_attributions a on a.invite_id=i.id
  group by i.id
), monthly as (
  select period_month,count(*) invitations_created,count(distinct inviter_user_id) active_inviters,
    count(*) filter(where unique_opens>0) invitations_opened,
    sum(unique_opens) unique_opens,sum(attributed_registrations) attributed_registrations,
    sum(attributed_joins) attributed_joins
  from invite_facts group by period_month
)
select *,
  round(invitations_created::numeric/nullif(active_inviters,0),4) invites_per_inviter,
  round(100.0*invitations_opened/nullif(invitations_created,0),2) invite_open_rate,
  round(100.0*attributed_registrations/nullif(unique_opens,0),2) open_to_registration_rate,
  round(100.0*attributed_joins/nullif(unique_opens,0),2) open_to_join_rate,
  round(100.0*attributed_joins/nullif(invitations_created,0),2) invite_to_join_rate,
  round(
    invitations_created::numeric/nullif(active_inviters,0)
    * attributed_registrations::numeric/nullif(invitations_created,0),4
  ) viral_coefficient_k
from monthly order by period_month;

-- 05_payment_reliability_v2.csv
-- Confirmed facts use events; the denominator remains operational obligations.
with obligations as (
  select ps.id cycle_id, ps.junta_id, ps.fecha_vencimiento,
    payer.profile_id payer_id
  from public.payment_schedules ps
  join public.junta_members payer on payer.junta_id=ps.junta_id
    and payer.orden_turno<>ps.cuota_numero
    and payer.created_at<ps.fecha_vencimiento::timestamptz+interval '1 day'
    and (payer.left_at is null or payer.left_at>=ps.fecha_vencimiento::timestamptz)
  where ps.fecha_vencimiento<=current_date
), facts as (
  select o.*, e.payment_id, (e.metadata->>'is_on_time')::boolean is_on_time,
    (e.metadata->>'hours_late')::numeric hours_late
  from obligations o left join public.user_activity_events e
    on e.cycle_id=o.cycle_id and e.profile_id=o.payer_id and e.event_type='payment_confirmed'
)
select date_trunc('month',fecha_vencimiento)::date period_month, count(*) expected_payments,
  count(payment_id) confirmed_payments, count(*)-count(payment_id) unpaid_payments,
  count(*) filter(where is_on_time) on_time_payments,
  count(*) filter(where payment_id is not null and not is_on_time) late_payments,
  round(100.0*count(payment_id)/nullif(count(*),0),2) payment_completion_rate,
  round(100.0*count(*) filter(where is_on_time)/nullif(count(*),0),2) on_time_payment_rate,
  round(avg(hours_late) filter(where payment_id is not null),2) average_hours_late
from facts group by 1 order by 1;

-- 06_volume_and_monthly_active_savers_v2.csv
-- Reconciles event timestamps with approved operational payments and amounts.
with confirmed as (
  select e.occurred_at confirmed_at, p.id payment_id, p.junta_id,
    p.profile_id payer_id, (e.metadata->>'receiver_user_id')::uuid receiver_id,
    j.moneda currency, coalesce(p.submitted_amount,p.monto) amount
  from public.user_activity_events e join public.payments p on p.id=e.payment_id
  join public.juntas j on j.id=p.junta_id
  where e.event_type='payment_confirmed'
    and (p.payment_status='approved' or p.estado::text='aprobado')
    and j.estado::text not in ('eliminada','bloqueada') and not coalesce(j.bloqueada,false)
), savers as (
  select date_trunc('month',confirmed_at)::date period_month,currency,payer_id user_id from confirmed
  union
  select date_trunc('month',confirmed_at)::date,currency,receiver_id from confirmed where receiver_id is not null
), monthly as (
  select date_trunc('month',confirmed_at)::date period_month,currency,
    count(distinct junta_id) juntas_with_movement, count(distinct payer_id) unique_payers,
    count(distinct receiver_id) unique_receivers, count(distinct payment_id) confirmed_payments,
    sum(amount) confirmed_volume
  from confirmed group by 1,2
), mas as (
  select period_month,currency,count(distinct user_id) monthly_active_savers
  from savers group by 1,2
)
select m.period_month,m.currency,m.juntas_with_movement,m.unique_payers,m.unique_receivers,
  mas.monthly_active_savers,m.confirmed_payments,m.confirmed_volume
from monthly m join mas using(period_month,currency) order by 1,2;
