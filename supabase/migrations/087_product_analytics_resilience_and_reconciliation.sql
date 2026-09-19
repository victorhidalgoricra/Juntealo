-- Analytics failures must never block operational writes.
-- The writer is deliberately best-effort; reconciliation restores missing facts.

create or replace function public.record_product_event(
  p_event_type text,
  p_event_key text,
  p_profile_id uuid default null,
  p_junta_id uuid default null,
  p_payment_id uuid default null,
  p_cycle_id uuid default null,
  p_invite_id uuid default null,
  p_notification_id uuid default null,
  p_source text default 'database_trigger',
  p_metadata jsonb default '{}'::jsonb,
  p_occurred_at timestamptz default now(),
  p_description text default ''
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  begin
    if p_metadata ?| array[
      'name','nombre','email','phone','telefono','celular','dni','address','direccion',
      'bank_account','cuenta_bancaria','otp','junta_name','title','message','content'
    ] then
      raise exception 'Analytics metadata contains a prohibited PII/free-text key';
    end if;

    insert into public.user_activity_events(
      profile_id, event_type, junta_id, payment_id, cycle_id, invite_id,
      notification_id, description, metadata, occurred_at, source, event_key, event_version
    ) values (
      p_profile_id, p_event_type, p_junta_id, p_payment_id, p_cycle_id, p_invite_id,
      p_notification_id,
      case when coalesce(p_description, '') <> '' then p_description
        when p_event_type = 'payment_confirmed' then 'Confirmaste un aporte'
        when p_event_type = 'junta_joined' then 'Te uniste a una junta'
        when p_event_type = 'cycle_completed' then 'Completaste un ciclo'
        else '' end,
      coalesce(p_metadata, '{}'::jsonb), coalesce(p_occurred_at, now()),
      p_source, p_event_key, 1
    )
    on conflict (event_key) where event_key is not null do nothing
    returning id into v_id;

    if v_id is null and p_event_key is not null then
      select id into v_id from public.user_activity_events where event_key = p_event_key;
    end if;
    return v_id;
  exception when others then
    -- Never propagate a purely analytical failure into the operational transaction.
    raise warning 'product analytics write failed for % (%): %', p_event_type, p_event_key, sqlerrm;
    return null;
  end;
end;
$$;

revoke all on function public.record_product_event(text,text,uuid,uuid,uuid,uuid,uuid,uuid,text,jsonb,timestamptz,text)
  from public, anon, authenticated;

-- One row per anomaly. This view is diagnostic and never mutates operational data.
create or replace view public.product_analytics_data_quality_issues
with (security_invoker = true) as
with duplicate_keys as (
  select event_key, count(*) issue_count
  from public.user_activity_events where event_key is not null
  group by event_key having count(*) > 1
), issues as (
  select 'confirmed_payment_missing_event'::text issue_type, p.id entity_id,
    p.junta_id, p.id payment_id, p.schedule_id cycle_id, null::uuid event_id,
    'repairable'::text repair_status
  from public.payments p
  where (p.payment_status='approved' or p.estado::text='aprobado')
    and not exists (select 1 from public.user_activity_events e
      where e.event_type='payment_confirmed' and e.payment_id=p.id)
  union all
  select 'payment_event_without_confirmation', e.payment_id, e.junta_id, e.payment_id,
    e.cycle_id, e.id, 'diagnostic'
  from public.user_activity_events e left join public.payments p on p.id=e.payment_id
  where e.event_type='payment_confirmed'
    and (p.id is null or not (coalesce(p.payment_status='approved',false) or p.estado::text='aprobado'))
  union all
  select 'active_junta_missing_event', j.id, j.id, null, null, null,
    case when j.activated_at is null then 'timestamp_unavailable' else 'repairable' end
  from public.juntas j
  where j.estado::text in ('activa','cerrada')
    and not exists (select 1 from public.user_activity_events e
      where e.event_type='junta_activated' and e.junta_id=j.id)
  union all
  select 'activation_event_for_inactive_junta', e.junta_id, e.junta_id, null, null,
    e.id, 'diagnostic'
  from public.user_activity_events e join public.juntas j on j.id=e.junta_id
  where e.event_type='junta_activated' and j.estado::text not in ('activa','cerrada')
  union all
  select 'completed_cycle_missing_event', ps.id, ps.junta_id, null, ps.id, null, 'repairable'
  from public.payment_schedules ps
  join public.payouts po on po.junta_id=ps.junta_id
    and po.ronda_numero=ps.cuota_numero and po.entregado_en is not null
  where not exists (select 1 from public.user_activity_events e
    where e.event_type='cycle_completed' and e.cycle_id=ps.id)
  union all
  select 'delivered_payout_missing_event', po.id, po.junta_id, null, ps.id, null, 'repairable'
  from public.payouts po left join public.payment_schedules ps
    on ps.junta_id=po.junta_id and ps.cuota_numero=po.ronda_numero
  where po.entregado_en is not null and not exists (
    select 1 from public.user_activity_events e
    where e.event_type='payout_completed' and e.event_key='payout_completed:'||po.id)
  union all
  select 'closed_junta_missing_event', j.id, j.id, null, null, null,
    case when coalesce(j.completed_at, x.completed_at) is null then 'timestamp_unavailable' else 'repairable' end
  from public.juntas j left join lateral (
    select max(entregado_en) completed_at from public.payouts where junta_id=j.id
  ) x on true
  where j.estado::text='cerrada' and not exists (
    select 1 from public.user_activity_events e
    where e.event_type='junta_completed' and e.junta_id=j.id)
  union all
  select 'duplicate_event_key', null, null, null, null, null, 'diagnostic'
  from duplicate_keys
  union all
  select 'event_without_junta', e.junta_id, e.junta_id, e.payment_id, e.cycle_id,
    e.id, 'diagnostic'
  from public.user_activity_events e left join public.juntas j on j.id=e.junta_id
  where e.junta_id is not null and j.id is null
  union all
  select 'event_without_payment', e.payment_id, e.junta_id, e.payment_id, e.cycle_id,
    e.id, 'diagnostic'
  from public.user_activity_events e left join public.payments p on p.id=e.payment_id
  where e.payment_id is not null and p.id is null
  union all
  select 'future_event', e.id, e.junta_id, e.payment_id, e.cycle_id, e.id, 'diagnostic'
  from public.user_activity_events e where e.occurred_at > now() + interval '5 minutes'
  union all
  select 'invalid_event_version', e.id, e.junta_id, e.payment_id, e.cycle_id,
    e.id, 'diagnostic'
  from public.user_activity_events e where e.event_version is null or e.event_version <> 1
  union all
  select 'missing_required_metadata', e.id, e.junta_id, e.payment_id, e.cycle_id,
    e.id, 'diagnostic'
  from public.user_activity_events e
  where (e.event_type='payment_confirmed' and not (e.metadata ?& array['confirmed_amount','is_on_time']))
     or (e.event_type='junta_created' and not (e.metadata ?& array['participant_capacity','currency','amount']))
     or (e.event_type='junta_filled' and not (e.metadata ?& array['participant_count','participant_capacity']))
)
select * from issues;

revoke all on public.product_analytics_data_quality_issues from public, anon, authenticated;
grant select on public.product_analytics_data_quality_issues to service_role;

-- Safe repair: inserts analytical facts only. Operational rows are read-only.
create or replace function public.reconcile_product_analytics()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_attempted integer := 0;
  r record;
  v_participants integer;
  v_expected integer;
  v_confirmed integer;
  v_amount numeric;
begin
  for r in
    select p.*, ps.fecha_vencimiento, receiver.profile_id receiver_id
    from public.payments p join public.payment_schedules ps on ps.id=p.schedule_id
    left join public.junta_members receiver on receiver.junta_id=p.junta_id
      and receiver.orden_turno=ps.cuota_numero and receiver.estado::text in ('activo','moroso')
    where (p.payment_status='approved' or p.estado::text='aprobado')
      and not exists (select 1 from public.user_activity_events e
        where e.event_type='payment_confirmed' and e.payment_id=p.id)
  loop
    perform public.record_product_event(
      'payment_confirmed','payment_confirmed:'||r.id,r.profile_id,r.junta_id,r.id,r.schedule_id,
      p_source:='backend', p_metadata:=jsonb_build_object(
        'expected_amount',coalesce(r.expected_amount,r.monto),
        'confirmed_amount',coalesce(r.submitted_amount,r.monto),
        'due_date',r.fecha_vencimiento,
        'payment_date',coalesce(r.submitted_at,r.pagado_en),
        'is_on_time',coalesce(r.submitted_at,r.pagado_en)<r.fecha_vencimiento::timestamptz+interval '1 day',
        'hours_late',greatest(extract(epoch from (coalesce(r.submitted_at,r.pagado_en)
          -(r.fecha_vencimiento::timestamptz+interval '1 day')))/3600.0,0),
        'receiver_user_id',r.receiver_id
      ), p_occurred_at:=coalesce(r.validated_at,r.submitted_at,r.pagado_en,r.created_at)
    );
    v_attempted := v_attempted + 1;
  end loop;

  for r in select * from public.juntas j
    where j.estado::text in ('activa','cerrada') and j.activated_at is not null
      and not exists (select 1 from public.user_activity_events e
        where e.event_type='junta_activated' and e.junta_id=j.id)
  loop
    select count(*) into v_participants from public.junta_members
      where junta_id=r.id and estado::text in ('activo','moroso');
    perform public.record_product_event(
      'junta_activated','junta_activated:'||r.id,r.admin_id,r.id,
      p_source:='backend',p_metadata:=jsonb_build_object(
        'participant_count',v_participants,'cycle_count',r.participantes_max,
        'activation_source','reconciliation'
      ),p_occurred_at:=r.activated_at
    );
    v_attempted := v_attempted + 1;
  end loop;

  for r in select po.*,ps.id cycle_id,j.participantes_max,ps.monto expected_unit
    from public.payouts po join public.juntas j on j.id=po.junta_id
    left join public.payment_schedules ps on ps.junta_id=po.junta_id and ps.cuota_numero=po.ronda_numero
    where po.entregado_en is not null
  loop
    perform public.record_product_event(
      'payout_completed','payout_completed:'||r.id,r.profile_id,r.junta_id,
      p_cycle_id:=r.cycle_id,p_source:='backend',p_metadata:=jsonb_build_object(
        'expected_amount',r.expected_unit*greatest(r.participantes_max-1,0),
        'actual_amount',r.monto_pozo
      ),p_occurred_at:=r.entregado_en
    );
    if r.cycle_id is not null then
      select greatest(count(*)-1,0) into v_expected from public.junta_members
        where junta_id=r.junta_id and estado::text in ('activo','moroso');
      select count(*),coalesce(sum(coalesce(submitted_amount,monto)),0)
        into v_confirmed,v_amount from public.payments
        where junta_id=r.junta_id and schedule_id=r.cycle_id
          and (payment_status='approved' or estado::text='aprobado');
      perform public.record_product_event(
        'cycle_completed','cycle_completed:'||r.cycle_id,r.profile_id,r.junta_id,
        p_cycle_id:=r.cycle_id,p_source:='backend',p_metadata:=jsonb_build_object(
          'cycle_number',r.ronda_numero,'expected_payments',v_expected,
          'confirmed_payments',v_confirmed,'total_confirmed_amount',v_amount
        ),p_occurred_at:=r.entregado_en
      );
    end if;
    v_attempted := v_attempted + 1;
  end loop;

  for r in select j.*,coalesce(j.completed_at,max(po.entregado_en)) effective_completed_at,
      count(po.id) cycles_completed,coalesce(sum(po.monto_pozo),0) total_volume
    from public.juntas j left join public.payouts po on po.junta_id=j.id and po.entregado_en is not null
    where j.estado::text='cerrada'
    group by j.id
  loop
    if r.effective_completed_at is not null then
      select count(*) into v_participants from public.junta_members
        where junta_id=r.id and estado::text in ('activo','moroso');
      perform public.record_product_event(
        'junta_completed','junta_completed:'||r.id,r.admin_id,r.id,
        p_source:='backend',p_metadata:=jsonb_build_object(
          'cycles_completed',r.cycles_completed,'total_volume',r.total_volume,
          'participant_count',v_participants
        ),p_occurred_at:=r.effective_completed_at
      );
      v_attempted := v_attempted + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'attempted_repairs',v_attempted,
    'remaining_issues',(select count(*) from public.product_analytics_data_quality_issues)
  );
exception when others then
  return jsonb_build_object('error',sqlerrm,'attempted_repairs',v_attempted);
end;
$$;

revoke all on function public.reconcile_product_analytics() from public, anon, authenticated;
grant execute on function public.reconcile_product_analytics() to service_role;

