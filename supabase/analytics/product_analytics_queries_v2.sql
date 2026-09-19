-- Product analytics V2: read-only queries using explicit lifecycle events.
-- Run numbered blocks individually; do not apply this file with db push.

-- 01_activation_funnel_v2.csv
with events as (
  select event_type, profile_id, junta_id, occurred_at
  from public.user_activity_events
  where event_type in (
    'user_registered','junta_created','junta_joined','junta_first_member_joined',
    'junta_filled','junta_activated','payment_confirmed','cycle_completed','junta_completed'
  )
), monthly as (
  select date_trunc('month', occurred_at)::date period_month,
    count(distinct profile_id) filter(where event_type='user_registered') registered_users,
    count(distinct profile_id) filter(where event_type='junta_joined') users_who_joined,
    count(distinct junta_id) filter(where event_type='junta_created') juntas_created,
    count(distinct junta_id) filter(where event_type='junta_first_member_joined') juntas_with_first_member,
    count(distinct junta_id) filter(where event_type='junta_filled') juntas_filled,
    count(distinct junta_id) filter(where event_type='junta_activated') juntas_activated,
    count(distinct junta_id) filter(where event_type='payment_confirmed') juntas_with_payment,
    count(distinct junta_id) filter(where event_type='cycle_completed') juntas_with_cycle,
    count(distinct junta_id) filter(where event_type='junta_completed') juntas_completed
  from events group by 1
)
select *,
  round(100.0*users_who_joined/nullif(registered_users,0),2) registration_to_join_rate,
  round(100.0*juntas_filled/nullif(juntas_created,0),2) fill_conversion_rate,
  round(100.0*juntas_activated/nullif(juntas_filled,0),2) filled_to_activation_rate,
  round(100.0*juntas_with_payment/nullif(juntas_activated,0),2) activation_to_payment_rate,
  round(100.0*juntas_completed/nullif(juntas_activated,0),2) completion_rate
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
with core as (
  select profile_id user_id, junta_id, occurred_at,
    row_number() over(partition by profile_id order by occurred_at,junta_id) participation_number
  from public.user_activity_events where event_type='junta_joined' and profile_id is not null
), completed as (
  select jm.profile_id user_id, e.junta_id, e.occurred_at completed_at
  from public.user_activity_events e join public.junta_members jm on jm.junta_id=e.junta_id
  where e.event_type='junta_completed'
), per_user as (
  select c.user_id, min(c.occurred_at) first_junta_at,
    min(c.occurred_at) filter(where participation_number=2) second_junta_at,
    min(done.completed_at) first_completed_at
  from core c left join completed done on done.user_id=c.user_id group by c.user_id
)
select p.*,
  (select min(c.occurred_at) from core c
    where c.user_id=p.user_id and c.occurred_at>p.first_completed_at) next_junta_after_completion,
  extract(epoch from (p.second_junta_at-p.first_junta_at))/86400.0 days_to_second_junta
from per_user p order by first_junta_at;

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
    count(distinct junta_id) active_juntas, count(distinct payer_id) unique_payers,
    count(distinct receiver_id) unique_receivers, count(distinct payment_id) confirmed_payments,
    sum(amount) confirmed_volume
  from confirmed group by 1,2
), mas as (
  select period_month,currency,count(distinct user_id) monthly_active_savers
  from savers group by 1,2
)
select m.period_month,m.currency,m.active_juntas,m.unique_payers,m.unique_receivers,
  mas.monthly_active_savers,m.confirmed_payments,m.confirmed_volume
from monthly m join mas using(period_month,currency) order by 1,2;
