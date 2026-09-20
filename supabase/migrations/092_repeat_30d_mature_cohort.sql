-- Shift Repeat <=30d completion cohorts back by the full observation window.
-- Preserve the 091 aggregate as a private implementation delegate so this
-- incremental migration changes no other dashboard metric.

alter function public.admin_product_dashboard(integer)
  rename to admin_product_dashboard_v091;

revoke all on function public.admin_product_dashboard_v091(integer) from public, anon, authenticated;

create or replace function public.admin_product_dashboard(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_days integer := case when p_days in (7, 30, 90) then p_days else 30 end;
  v_repeat_window_days constant integer := 30;
  v_current_start timestamptz;
  v_current_end timestamptz;
  v_previous_start timestamptz;
  v_previous_end timestamptz;
  v_repeat jsonb;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if not public.admin_is_backoffice(auth.uid()) then raise exception 'No autorizado'; end if;

  v_current_end := v_now - make_interval(days => v_repeat_window_days);
  v_current_start := v_current_end - make_interval(days => v_days);
  v_previous_end := v_current_start;
  v_previous_start := v_previous_end - make_interval(days => v_days);

  v_result := public.admin_product_dashboard_v091(v_days);

  with
  period_ranges as (
    select * from (values
      ('current'::text, v_current_start, v_current_end),
      ('previous'::text, v_previous_start, v_previous_end)
    ) p(period_name, range_start, range_end)
  ),
  completed_participations as materialized (
    select distinct jm.profile_id, e.junta_id, e.occurred_at completed_at
    from public.user_activity_events e
    join public.junta_members jm on jm.junta_id=e.junta_id
    where e.event_type='junta_completed'
      and e.occurred_at>=v_previous_start and e.occurred_at<v_current_end
      and jm.estado::text in ('activo','moroso')
  ),
  repeat_eligible as materialized (
    select distinct on (p.period_name, cp.profile_id)
      p.period_name, cp.profile_id, cp.junta_id completed_junta_id, cp.completed_at
    from period_ranges p
    join completed_participations cp
      on cp.completed_at>=p.range_start and cp.completed_at<p.range_end
    order by p.period_name, cp.profile_id, cp.completed_at, cp.junta_id
  ),
  repeat_by_period as (
    select p.period_name,
      count(r.profile_id) eligible_users,
      count(r.profile_id) filter(where exists(
        select 1 from public.user_activity_events e
        where e.event_type='junta_joined'
          and e.profile_id=r.profile_id
          and e.junta_id<>r.completed_junta_id
          and e.occurred_at>r.completed_at
          and e.occurred_at<=r.completed_at+make_interval(days => v_repeat_window_days)
      )) repeated_users
    from period_ranges p
    left join repeat_eligible r on r.period_name=p.period_name
    group by p.period_name
  )
  select jsonb_build_object(
    'current',(
      select jsonb_build_object(
        'eligibleUsers',eligible_users,
        'repeatedUsers',repeated_users,
        'rate',100.0*repeated_users/nullif(eligible_users,0)
      ) from repeat_by_period where period_name='current'
    ),
    'previous',(
      select jsonb_build_object(
        'eligibleUsers',eligible_users,
        'repeatedUsers',repeated_users,
        'rate',100.0*repeated_users/nullif(eligible_users,0)
      ) from repeat_by_period where period_name='previous'
    )
  ) into v_repeat;

  return jsonb_set(v_result, '{health,repeatWithin30d}', v_repeat, true);
end;
$$;

revoke all on function public.admin_product_dashboard(integer) from public, anon;
grant execute on function public.admin_product_dashboard(integer) to authenticated;
