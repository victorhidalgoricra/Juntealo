-- Correct metric semantics without rewriting migration 089, which may already be applied.
-- The dashboard remains one aggregated RPC per load/period change.

create or replace function public.admin_product_dashboard(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_days integer := case when p_days in (7, 30, 90) then p_days else 30 end;
  v_start timestamptz;
  v_previous_start timestamptz;
  v_bucket text;
  v_stale_junta_days constant integer := 3;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if not public.admin_is_backoffice(auth.uid()) then raise exception 'No autorizado'; end if;

  v_start := v_now - make_interval(days => v_days);
  v_previous_start := v_start - make_interval(days => v_days);
  v_bucket := case when v_days = 90 then 'week' else 'day' end;

  with
  boundaries as (
    select v_previous_start previous_start, v_start current_start, v_now period_end
  ),
  confirmed as materialized (
    select e.occurred_at, p.id payment_id, p.junta_id, p.profile_id payer_id,
      nullif(e.metadata->>'receiver_user_id', '')::uuid receiver_id,
      coalesce(p.submitted_amount, p.monto) amount, j.moneda currency,
      coalesce((e.metadata->>'is_on_time')::boolean,
        coalesce(p.submitted_at, p.pagado_en) < ps.fecha_vencimiento::timestamptz + interval '1 day') is_on_time
    from public.user_activity_events e
    join public.payments p on p.id = e.payment_id
    join public.payment_schedules ps on ps.id = p.schedule_id
    join public.juntas j on j.id = p.junta_id
    cross join boundaries b
    where e.event_type = 'payment_confirmed'
      and e.occurred_at >= b.previous_start and e.occurred_at < b.period_end
      and (p.payment_status = 'approved' or p.estado::text = 'aprobado')
      and j.estado::text not in ('eliminada', 'bloqueada')
      and not coalesce(j.bloqueada, false)
  ),
  saver_facts as materialized (
    select occurred_at, payer_id user_id from confirmed
    union
    select occurred_at, receiver_id from confirmed where receiver_id is not null
  ),
  creation_cohorts as materialized (
    select e.junta_id, min(e.occurred_at) created_at
    from public.user_activity_events e cross join boundaries b
    where e.event_type = 'junta_created' and e.junta_id is not null
      and e.occurred_at >= b.previous_start and e.occurred_at < b.period_end
    group by e.junta_id
  ),
  period_metrics as (
    select period_name,
      (select count(distinct s.user_id) from saver_facts s where s.occurred_at >= range_start and s.occurred_at < range_end) active_savers,
      (select count(distinct c.junta_id) from confirmed c where c.occurred_at >= range_start and c.occurred_at < range_end) juntas_with_movement,
      (select coalesce(sum(c.amount), 0) from confirmed c where c.currency='PEN' and c.occurred_at >= range_start and c.occurred_at < range_end) confirmed_volume,
      (select count(*) from creation_cohorts c where c.created_at >= range_start and c.created_at < range_end) juntas_created,
      (select count(*) from creation_cohorts c where c.created_at >= range_start and c.created_at < range_end
        and exists(select 1 from public.user_activity_events e where e.junta_id=c.junta_id
          and e.event_type='junta_activated' and e.occurred_at>=c.created_at and e.occurred_at<v_now)) juntas_activated,
      (select count(*) from confirmed c where c.occurred_at >= range_start and c.occurred_at < range_end) confirmed_payments,
      (select count(*) from confirmed c where c.occurred_at >= range_start and c.occurred_at < range_end and c.is_on_time) on_time_payments
    from boundaries b
    cross join lateral (values
      ('current'::text, b.current_start, b.period_end),
      ('previous'::text, b.previous_start, b.current_start)
    ) p(period_name, range_start, range_end)
  ),
  current_cohort as materialized (
    select c.junta_id, c.created_at
    from creation_cohorts c where c.created_at >= v_start and c.created_at < v_now
  ),
  cohort_progress as materialized (
    select c.junta_id, c.created_at, j.completed_at, j.estado::text junta_status, coalesce(j.bloqueada,false) blocked,
      exists(select 1 from public.user_activity_events e where e.junta_id=c.junta_id and e.event_type='junta_first_member_joined' and e.occurred_at>=c.created_at and e.occurred_at<v_now) has_first_member,
      exists(select 1 from public.user_activity_events e where e.junta_id=c.junta_id and e.event_type='junta_filled' and e.occurred_at>=c.created_at and e.occurred_at<v_now) has_filled,
      exists(select 1 from public.user_activity_events e where e.junta_id=c.junta_id and e.event_type='junta_activated' and e.occurred_at>=c.created_at and e.occurred_at<v_now) has_activated,
      exists(select 1 from public.user_activity_events e where e.junta_id=c.junta_id and e.event_type='payment_confirmed' and e.occurred_at>=c.created_at and e.occurred_at<v_now) has_first_payment,
      exists(select 1 from public.user_activity_events e where e.junta_id=c.junta_id and e.event_type='junta_completed' and e.occurred_at>=c.created_at and e.occurred_at<v_now) has_completed
    from current_cohort c join public.juntas j on j.id=c.junta_id
  ),
  funnel as (
    select count(*) created,
      count(*) filter(where has_first_member) first_member,
      count(*) filter(where has_filled) filled,
      count(*) filter(where has_activated) activated,
      count(*) filter(where has_first_payment) first_payment,
      count(*) filter(where has_completed) completed,
      count(*) filter(where not has_completed and junta_status not in ('cerrada','eliminada','bloqueada') and not blocked) open_in_progress,
      percentile_cont(.5) within group(order by extract(epoch from (v_now-created_at))/86400.0) median_age_days
    from cohort_progress
  ),
  lifecycle_times as (
    select
      percentile_cont(.5) within group(order by extract(epoch from (j.first_filled_at-j.created_at))/3600.0) filter(where j.first_filled_at is not null) median_hours_to_fill,
      percentile_cont(.5) within group(order by extract(epoch from (j.activated_at-j.created_at))/3600.0) filter(where j.activated_at is not null) median_hours_to_activation
    from public.juntas j join current_cohort c on c.junta_id=j.id
  ),
  series_buckets as (
    select bucket_start, least(bucket_start + case when v_bucket='week' then interval '1 week' else interval '1 day' end, v_now) bucket_end
    from generate_series(date_trunc(v_bucket, v_start), date_trunc(v_bucket, v_now), case when v_bucket='week' then interval '1 week' else interval '1 day' end) bucket_start
  ),
  evolution as (
    select sb.bucket_start,
      (select count(distinct sf.user_id) from saver_facts sf where sf.occurred_at >= greatest(sb.bucket_start, v_start) and sf.occurred_at < sb.bucket_end) active_savers,
      (select coalesce(sum(c.amount),0) from confirmed c where c.currency='PEN' and c.occurred_at >= greatest(sb.bucket_start, v_start) and c.occurred_at < sb.bucket_end) volume,
      (select count(distinct c.junta_id) from confirmed c where c.occurred_at >= greatest(sb.bucket_start, v_start) and c.occurred_at < sb.bucket_end) juntas_with_movement
    from series_buckets sb where sb.bucket_end > v_start
  ),
  retained as (
    select
      (select count(distinct cur.user_id) from saver_facts cur cross join boundaries b where cur.occurred_at >= b.current_start and cur.occurred_at < b.period_end
        and exists(select 1 from saver_facts prev where prev.user_id=cur.user_id and prev.occurred_at >= b.previous_start and prev.occurred_at < b.current_start)) retained_users,
      (select count(distinct prev.user_id) from saver_facts prev cross join boundaries b where prev.occurred_at >= b.previous_start and prev.occurred_at < b.current_start) previous_savers
  ),
  completed_participations as materialized (
    select distinct jm.profile_id, e.junta_id, e.occurred_at completed_at
    from public.user_activity_events e join public.junta_members jm on jm.junta_id=e.junta_id
    cross join boundaries b
    where e.event_type='junta_completed' and e.occurred_at>=b.current_start and e.occurred_at<b.period_end
      and jm.estado::text in ('activo','moroso')
  ),
  repeat_eligible as materialized (
    select distinct on (profile_id) profile_id, junta_id completed_junta_id, completed_at
    from completed_participations order by profile_id, completed_at, junta_id
  ),
  repeat_outcomes as (
    select d.profile_id, d.completed_at, n.next_join_at
    from repeat_eligible d
    left join lateral (
      select min(e.occurred_at) next_join_at from public.user_activity_events e
      where e.event_type='junta_joined' and e.profile_id=d.profile_id
        and e.junta_id<>d.completed_junta_id and e.occurred_at>d.completed_at and e.occurred_at<v_now
    ) n on true
  ),
  invite_facts as (
    select i.id, i.enviado_por, count(distinct a.anonymous_visitor_id) opens, count(distinct a.registered_user_id) registrations
    from public.invitations i left join public.junta_invite_attributions a on a.invite_id=i.id cross join boundaries b
    where i.created_at >= b.current_start and i.created_at < b.period_end group by i.id
  ),
  virality as (
    select count(*) links, count(distinct enviado_por) inviters, coalesce(sum(opens),0) opens, coalesce(sum(registrations),0) registrations from invite_facts
  ),
  attention as (
    select
      (select count(*) from public.payments where payment_status in ('submitted','validating') or estado::text in ('pendiente_aprobacion','validando')) pending_validation,
      (select count(*) from public.juntas j where j.created_at < v_now-make_interval(days => v_stale_junta_days) and j.first_filled_at is null
        and j.estado::text not in ('cerrada','eliminada','bloqueada') and not coalesce(j.bloqueada,false)) stale_unfilled,
      (select count(*) from public.payment_schedules ps join public.junta_members payer on payer.junta_id=ps.junta_id and payer.orden_turno<>ps.cuota_numero
        and payer.created_at<ps.fecha_vencimiento::timestamptz+interval '1 day' and (payer.left_at is null or payer.left_at>=ps.fecha_vencimiento::timestamptz)
        where ps.fecha_vencimiento<current_date and not exists(select 1 from public.payments p where p.schedule_id=ps.id and p.profile_id=payer.profile_id
          and (p.payment_status='approved' or p.estado::text='aprobado'))) overdue_payments
  ),
  quality as (
    select (select count(*) from public.product_analytics_data_quality_issues) + (select count(*) from public.product_analytics_invite_quality_issues) issue_count
  )
  select jsonb_build_object(
    'period', jsonb_build_object('days',v_days,'start',v_start,'end',v_now,'previousStart',v_previous_start,'granularity',v_bucket,'analyticsCompleteSince',null),
    'kpis', jsonb_build_object(
      'activeSavers', jsonb_build_object('current',(select active_savers from period_metrics where period_name='current'),'previous',(select active_savers from period_metrics where period_name='previous')),
      'juntasWithMovement', jsonb_build_object('current',(select juntas_with_movement from period_metrics where period_name='current'),'previous',(select juntas_with_movement from period_metrics where period_name='previous')),
      'confirmedVolume', jsonb_build_object('current',(select confirmed_volume from period_metrics where period_name='current'),'previous',(select confirmed_volume from period_metrics where period_name='previous')),
      'activationRate', jsonb_build_object('current',(select 100.0*juntas_activated/nullif(juntas_created,0) from period_metrics where period_name='current'),'previous',(select 100.0*juntas_activated/nullif(juntas_created,0) from period_metrics where period_name='previous')),
      'onTimePaymentRate', jsonb_build_object('current',(select 100.0*on_time_payments/nullif(confirmed_payments,0) from period_metrics where period_name='current'),'previous',(select 100.0*on_time_payments/nullif(confirmed_payments,0) from period_metrics where period_name='previous'))
    ),
    'funnel', (select to_jsonb(f) from funnel f) || (select to_jsonb(l) from lifecycle_times l),
    'evolution', coalesce((select jsonb_agg(jsonb_build_object('date',bucket_start,'activeSavers',active_savers,'volume',volume,'juntasWithMovement',juntas_with_movement) order by bucket_start) from evolution),'[]'::jsonb),
    'health', jsonb_build_object(
      'repeatJuntaRate',(select 100.0*count(*) filter(where next_join_at is not null)/nullif(count(*),0) from repeat_outcomes),
      'retentionRate',(select 100.0*retained_users/nullif(previous_savers,0) from retained),
      'medianDaysToNextJunta',(select percentile_cont(.5) within group(order by extract(epoch from (next_join_at-completed_at))/86400.0) filter(where next_join_at is not null) from repeat_outcomes),
      'fillRate',(select 100.0*filled/nullif(created,0) from funnel),
      'medianHoursToFill',(select median_hours_to_fill from lifecycle_times),
      'uncompletedJuntas',(select open_in_progress from funnel),
      'inviteConversion',(select 100.0*registrations/nullif(opens,0) from virality),
      'invitesPerInviter',(select links::numeric/nullif(inviters,0) from virality),
      'kFactor',(select registrations::numeric/nullif(inviters,0) from virality)
    ),
    'attention',(select to_jsonb(a) from attention a),
    'config',jsonb_build_object('staleJuntaDays',v_stale_junta_days),
    'dataQualityIssues',(select issue_count from quality)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_product_dashboard(integer) from public, anon;
grant execute on function public.admin_product_dashboard(integer) to authenticated;
