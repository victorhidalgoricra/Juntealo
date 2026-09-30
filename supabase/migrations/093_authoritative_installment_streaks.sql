begin;

-- Installment streaks: confirmed on-time payments only; dates end at midnight in Peru.
alter table public.profiles drop constraint if exists chk_profiles_estado_racha;
alter table public.profiles add constraint chk_profiles_estado_racha check (estado_racha in ('activa', 'en_riesgo', 'rota', 'en_revision'));
-- Legacy *_semanas columns retain their names for compatibility but count installments.
create table public.junta_streaks (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  junta_id uuid not null references public.juntas(id) on delete cascade,
  result jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (profile_id, junta_id)
);
create table public.streak_rewards (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  bonus_points integer not null default 6 check (bonus_points = 6),
  earned_at timestamptz not null default now()
);
alter table public.junta_streaks enable row level security;
alter table public.streak_rewards enable row level security;
create policy streak_read on public.junta_streaks for select to authenticated using (profile_id = auth.uid());
create policy streak_reward_read on public.streak_rewards for select to authenticated using (profile_id = auth.uid());
revoke insert, update, delete on public.junta_streaks, public.streak_rewards from anon, authenticated;
grant select on public.junta_streaks, public.streak_rewards to authenticated;
drop policy if exists "Users can insert their own racha hitos" on public.racha_hitos;

create function public.compute_installment_streak(p_profile uuid, p_junta uuid, p_now timestamptz default now())
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  s record; v_streak integer := 0; v_record integer := 0; v_pending integer := 0;
  v_blocked boolean := false; v_debt boolean := false; v_broken integer; v_broken_date date;
  v_next timestamptz; v_hours integer; v_state text;
begin
  for s in
    with members as (
      select profile_id, row_number() over (order by orden_turno, id) - 1 as idx,
        count(*) over () as total
      from public.junta_members where junta_id = p_junta and estado::text = 'activo'
    )
    select ps.*,
      ((ps.fecha_vencimiento + 1)::timestamp at time zone 'America/Lima') - interval '1 millisecond' as deadline,
      coalesce(outcomes.approved, false) as approved,
      coalesce(outcomes.review, false) as review,
      coalesce(outcomes.any_approved, false) as any_approved
    from public.payment_schedules ps
    left join lateral (
      select
        bool_or(status = 'approved' and registered_at <= ((ps.fecha_vencimiento + 1)::timestamp at time zone 'America/Lima') - interval '1 millisecond') as approved,
        bool_or(status in ('submitted', 'validating') and registered_at <= ((ps.fecha_vencimiento + 1)::timestamp at time zone 'America/Lima') - interval '1 millisecond') as review,
        bool_or(status = 'approved') as any_approved
      from (
        select coalesce(p.submitted_at, p.pagado_en) as registered_at,
          case coalesce(p.payment_status, p.estado::text)
            when 'aprobado' then 'approved' when 'pagado' then 'approved'
            when 'pendiente_aprobacion' then 'submitted' when 'en_validacion' then 'submitted'
            when 'validando' then 'validating' else coalesce(p.payment_status, p.estado::text) end as status
        from public.payments p where p.junta_id = p_junta and p.schedule_id = ps.id and p.profile_id = p_profile
      ) payments
    ) outcomes on true
    where ps.junta_id = p_junta and not exists (
      select 1 from members m where m.profile_id = p_profile and m.idx = mod(ps.cuota_numero - 1, m.total)
    ) order by ps.cuota_numero
  loop
    if s.approved then
      if not v_blocked then
        v_streak := v_streak + 1; v_record := greatest(v_record, v_streak);
        v_broken := null; v_broken_date := null;
      end if;
    elsif s.review then
      v_pending := v_pending + 1; v_blocked := true;
    elsif s.deadline < p_now then
      v_streak := 0; v_pending := 0; v_blocked := false;
      v_broken := s.cuota_numero; v_broken_date := s.fecha_vencimiento;
      v_debt := v_debt or not s.any_approved;
    else
      v_next := coalesce(v_next, s.deadline); v_blocked := true;
    end if;
  end loop;
  v_hours := greatest(0, ceil(extract(epoch from (v_next - p_now)) / 3600)::integer);
  v_state := case when v_pending > 0 then 'en_revision' when v_broken is not null then 'rota'
    when v_next is not null and v_hours <= 48 then 'en_riesgo' else 'activa' end;
  return jsonb_strip_nulls(jsonb_build_object(
    'juntaId', p_junta, 'semanasActual', v_streak, 'recordPersonal', v_record,
    'proximoHito', case when v_streak < 4 then 4 when v_streak < 8 then 8 else 12 end,
    'estado', v_state, 'horasRestantes', case when v_next is not null then v_hours end,
    'cuotaInterrumpida', v_broken, 'fechaInterrupcion', v_broken_date,
    'pendientesRevision', v_pending, 'tieneDeuda', v_debt));
end;
$$;

create function public.refresh_profile_streaks(p_profile uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_j record; r jsonb; best jsonb; h integer;
begin
  -- Serialize reward/snapshot updates for concurrent approvals for the same person.
  perform 1 from public.profiles where id = p_profile for update;
  if not found then return; end if;
  delete from public.junta_streaks st where st.profile_id = p_profile and not exists (
    select 1 from public.juntas j where j.id = st.junta_id and j.estado::text in ('activa', 'cerrada')
      and not coalesce(j.bloqueada, false) and j.deleted_at is null
      and (j.admin_id = p_profile or exists (select 1 from public.junta_members m
        where m.junta_id = j.id and m.profile_id = p_profile and m.estado::text in ('activo', 'moroso')))
  );
  for v_j in select * from public.juntas j where j.estado::text in ('activa', 'cerrada')
    and not coalesce(j.bloqueada, false) and j.deleted_at is null
    and (j.admin_id = p_profile or exists (select 1 from public.junta_members m
      where m.junta_id = j.id and m.profile_id = p_profile and m.estado::text in ('activo', 'moroso')))
    order by j.id
  loop
    r := public.compute_installment_streak(p_profile, v_j.id);
    insert into public.junta_streaks(profile_id, junta_id, result) values (p_profile, v_j.id, r)
      on conflict (profile_id, junta_id) do update set result = excluded.result, updated_at = now();
    update public.junta_members set racha_semanas = (r->>'semanasActual')::integer,
      racha_record = (r->>'recordPersonal')::integer where profile_id = p_profile and junta_id = v_j.id;
    foreach h in array array[4,8,12] loop
      if (r->>'recordPersonal')::integer >= h then
        insert into public.racha_hitos(profile_id, junta_id, hito_semanas) values(p_profile, v_j.id, h)
          on conflict (profile_id, junta_id, hito_semanas) do nothing;
      end if;
    end loop;
    if (r->>'recordPersonal')::integer >= 4 then
      insert into public.streak_rewards(profile_id) values(p_profile) on conflict do nothing;
    end if;
  end loop;
  select result into best from public.junta_streaks where profile_id = p_profile
    order by (result->>'semanasActual')::integer desc, (result->>'recordPersonal')::integer desc, junta_id limit 1;
  update public.profiles set racha_actual = coalesce((best->>'semanasActual')::integer, 0),
    record_racha = coalesce((select max((result->>'recordPersonal')::integer) from public.junta_streaks where profile_id = p_profile),0),
    estado_racha = coalesce(best->>'estado', 'activa')
    where id = p_profile;
end;
$$;

-- RPC is auth-scoped and recalculates time-dependent deadlines before reading.
create function public.get_my_streaks()
returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); result jsonb;
begin
  if u is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  perform public.refresh_profile_streaks(u);
  select jsonb_build_object('streaks', coalesce(jsonb_agg(st.result order by st.junta_id), '[]'::jsonb),
    'rewardPoints', coalesce((select bonus_points from public.streak_rewards where profile_id = u), 0))
    into result from public.junta_streaks st where st.profile_id = u;
  return result;
end;
$$;

create function public.refresh_junta_streaks_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare u uuid; ids uuid[];
begin
  if tg_table_name = 'juntas' then
    ids := array[case when tg_op <> 'INSERT' then old.id end, case when tg_op <> 'DELETE' then new.id end];
  else
    ids := array[case when tg_op <> 'INSERT' then old.junta_id end, case when tg_op <> 'DELETE' then new.junta_id end];
  end if;
  for u in
    select profile_id from public.junta_members where junta_id = any(ids)
    union select admin_id from public.juntas where id = any(ids)
    union select profile_id from public.junta_streaks where junta_id = any(ids)
    order by 1
  loop perform public.refresh_profile_streaks(u); end loop;
  return null;
end;
$$;
create trigger payment_streak_refresh after insert or update or delete on public.payments
  for each row execute function public.refresh_junta_streaks_trigger();
create trigger schedule_streak_refresh after insert or update or delete on public.payment_schedules
  for each row execute function public.refresh_junta_streaks_trigger();
create trigger member_streak_refresh after insert or delete or update of estado, orden_turno, junta_id, profile_id on public.junta_members
  for each row execute function public.refresh_junta_streaks_trigger();
create trigger junta_streak_refresh after update of estado, bloqueada, deleted_at, admin_id on public.juntas
  for each row execute function public.refresh_junta_streaks_trigger();

-- The streak mission is awarded by the backend once, never by client-supplied claims.
create function public.guard_streak_mission_claim()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.mission_id = 'on_time_streak_4_rounds' then
    raise exception 'La recompensa de racha se otorga automáticamente una sola vez.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger guard_streak_claim before insert or update on public.claimed_missions
  for each row execute function public.guard_streak_mission_claim();

create function public.refresh_all_streaks()
returns void language plpgsql security definer set search_path = public as $$
declare u uuid;
begin
  for u in select id from public.profiles order by id loop perform public.refresh_profile_streaks(u); end loop;
end;
$$;
revoke all on function public.compute_installment_streak(uuid,uuid,timestamptz),
  public.refresh_profile_streaks(uuid), public.refresh_junta_streaks_trigger(), public.refresh_all_streaks(),
  public.guard_streak_mission_claim(), public.get_my_streaks() from public, anon, authenticated;
grant execute on function public.get_my_streaks() to authenticated;
grant execute on function public.refresh_all_streaks() to service_role;

-- Backfill from payment evidence, not from client-generated legacy milestones.
select public.refresh_all_streaks();
-- Enable the scheduler when the host provides it; reads also refresh expired deadlines.
do $$ begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
  end if;
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('refresh-installment-streaks', '*/15 * * * *', 'select public.refresh_all_streaks()');
  end if;
end $$;

-- Enforce score-based junta creation limits at the database boundary.
-- The client-side checks are UX only; this trigger is the authoritative guard.

create or replace function public.current_junta_score(p_profile_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_on_time_recent numeric := 0;
  v_late_recent numeric := 0;
  v_default_recent numeric := 0;
  v_on_time_lifetime numeric := 0;
  v_late_lifetime numeric := 0;
  v_default_lifetime numeric := 0;
  v_completed_cycles numeric := 0;
  v_streak numeric := 0;
  v_abandoned numeric := 0;
  v_suspicious numeric := 0;
  v_recent_weighted numeric;
  v_lifetime_weighted numeric;
  v_recent_ratio numeric;
  v_lifetime_ratio numeric;
  v_evidence numeric;
  v_confidence numeric;
  v_raw_score numeric;
begin
  if p_profile_id is null then
    return 0;
  end if;

  with my_juntas as (
    select j.id
    from public.juntas j
    where j.admin_id = p_profile_id and j.estado::text <> 'eliminada'
    union
    select jm.junta_id
    from public.junta_members jm
    where jm.profile_id = p_profile_id and jm.estado::text in ('activo', 'moroso')
  ), schedule_outcomes as (
    select
      ps.fecha_vencimiento,
      case when not coalesce(j.bloqueada, false) and j.deleted_at is null then j.estado::text end as junta_estado,
      coalesce(coalesce(p.payment_status, p.estado::text) in ('approved', 'aprobado', 'pagado'), false) as approved,
      coalesce(coalesce(p.payment_status, p.estado::text) in ('submitted', 'validating', 'pendiente_aprobacion', 'en_validacion', 'validando'), false) as in_review,
      coalesce(p.submitted_at, p.pagado_en, p.validated_at) as paid_at,
      ps.estado::text as schedule_estado
    from public.payment_schedules ps
    join my_juntas mj on mj.id = ps.junta_id
    join public.juntas j on j.id = ps.junta_id
    left join lateral (
      select pay.*
      from public.payments pay
      where pay.junta_id = ps.junta_id
        and pay.schedule_id = ps.id
        and pay.profile_id = p_profile_id
      order by pay.created_at desc
      limit 1
    ) p on true
    where not exists (
      select 1 from (
        select jm.profile_id, row_number() over (order by jm.orden_turno, jm.id) - 1 as idx, count(*) over () as total
        from public.junta_members jm where jm.junta_id = ps.junta_id and jm.estado::text = 'activo'
      ) receiver where receiver.profile_id = p_profile_id and receiver.idx = mod(ps.cuota_numero - 1, receiver.total)
    )
  )
  select
    count(*) filter (where approved and paid_at <= (((fecha_vencimiento + 1)::timestamp at time zone 'America/Lima') - interval '1 millisecond')
      and (((fecha_vencimiento + 1)::timestamp at time zone 'America/Lima') - interval '1 millisecond') between now() - interval '90 days' and now()),
    count(*) filter (where approved and paid_at > (((fecha_vencimiento + 1)::timestamp at time zone 'America/Lima') - interval '1 millisecond')
      and (((fecha_vencimiento + 1)::timestamp at time zone 'America/Lima') - interval '1 millisecond') between now() - interval '90 days' and now()),
    count(*) filter (where not approved and not in_review and junta_estado = 'activa'
      and (schedule_estado = 'vencida' or (((fecha_vencimiento + 1)::timestamp at time zone 'America/Lima') - interval '1 millisecond') < now())
      and (((fecha_vencimiento + 1)::timestamp at time zone 'America/Lima') - interval '1 millisecond') between now() - interval '90 days' and now()),
    count(*) filter (where approved and paid_at <= (((fecha_vencimiento + 1)::timestamp at time zone 'America/Lima') - interval '1 millisecond')),
    count(*) filter (where approved and paid_at > (((fecha_vencimiento + 1)::timestamp at time zone 'America/Lima') - interval '1 millisecond')),
    count(*) filter (where not approved and not in_review and junta_estado = 'activa'
      and (schedule_estado = 'vencida' or (((fecha_vencimiento + 1)::timestamp at time zone 'America/Lima') - interval '1 millisecond') < now()))
  into v_on_time_recent, v_late_recent, v_default_recent,
    v_on_time_lifetime, v_late_lifetime, v_default_lifetime
  from schedule_outcomes;

  select count(*) into v_completed_cycles
  from public.juntas j
  where j.estado::text = 'cerrada'
    and (
      j.admin_id = p_profile_id
      or exists (
        select 1 from public.junta_members jm
        where jm.junta_id = j.id and jm.profile_id = p_profile_id
          and jm.estado::text in ('activo', 'moroso')
      )
    );

  select coalesce(max((public.compute_installment_streak(p_profile_id, j.id)->>'semanasActual')::integer), 0)
  into v_streak from public.juntas j
  where j.estado::text in ('activa', 'cerrada') and not coalesce(j.bloqueada, false) and j.deleted_at is null
    and (j.admin_id = p_profile_id or exists (select 1 from public.junta_members m
      where m.junta_id = j.id and m.profile_id = p_profile_id and m.estado::text in ('activo', 'moroso')));

  select count(*) into v_abandoned
  from public.junta_members jm
  where jm.profile_id = p_profile_id and jm.estado::text = 'retirado';

  select count(*) into v_suspicious
  from public.payments p
  where p.profile_id = p_profile_id
    and lower(coalesce(p.internal_note, '') || ' ' || coalesce(p.rejection_reason, ''))
      ~ '(fraude|sospech|abuso)';

  v_recent_weighted := v_on_time_recent + (v_late_recent * 1.25) + (v_default_recent * 1.75);
  v_lifetime_weighted := v_on_time_lifetime + (v_late_lifetime * 1.15) + (v_default_lifetime * 1.5);
  v_recent_ratio := case when v_recent_weighted > 0 then v_on_time_recent / v_recent_weighted else 0 end;
  v_lifetime_ratio := case when v_lifetime_weighted > 0 then v_on_time_lifetime / v_lifetime_weighted else 0 end;
  v_evidence := greatest(v_recent_weighted, v_lifetime_weighted);
  v_confidence := case when v_evidence <= 0 then 0
    else 0.35 + (least(v_evidence, 6) / 6 * 0.65) end;

  v_raw_score :=
    (((v_recent_ratio * 0.7) + (v_lifetime_ratio * 0.3)) * v_confidence * 50)
    + (least(v_completed_cycles, 6) / 6 * 20)
    + (least(v_streak, 12) / 12 * 15)
    - least((v_late_recent * 3) + (v_default_recent * 8) + (v_abandoned * 7) + (v_suspicious * 10), 35)
    + coalesce((select bonus_points from public.streak_rewards where profile_id = p_profile_id), 0);

  return greatest(0, least(100, round(v_raw_score)))::integer;
end;
$$;


-- Notify the API after installing the new authenticated RPC.
notify pgrst, 'reload schema';

revoke all on function public.current_junta_score(uuid) from public, anon, authenticated;
commit;
