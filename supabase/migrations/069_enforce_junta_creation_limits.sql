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
      j.estado::text as junta_estado,
      coalesce(p.payment_status = 'approved' or p.estado::text = 'aprobado', false) as approved,
      coalesce(p.payment_status in ('submitted', 'validating')
        or p.estado::text = 'pendiente_aprobacion', false) as in_review,
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
  )
  select
    count(*) filter (where approved and paid_at <= fecha_vencimiento::timestamptz
      and fecha_vencimiento between current_date - 90 and current_date),
    count(*) filter (where approved and paid_at > fecha_vencimiento::timestamptz
      and fecha_vencimiento between current_date - 90 and current_date),
    count(*) filter (where not approved and not in_review and junta_estado = 'activa'
      and (schedule_estado = 'vencida' or fecha_vencimiento < current_date)
      and fecha_vencimiento between current_date - 90 and current_date),
    count(*) filter (where approved and paid_at <= fecha_vencimiento::timestamptz),
    count(*) filter (where approved and paid_at > fecha_vencimiento::timestamptz),
    count(*) filter (where not approved and not in_review and junta_estado = 'activa'
      and (schedule_estado = 'vencida' or fecha_vencimiento < current_date))
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

  -- Match the client: walk approved payments backwards while gaps stay <= 10 days.
  with approved_dates as (
    select coalesce(p.submitted_at, p.pagado_en, p.validated_at) as paid_at
    from public.payments p
    where p.profile_id = p_profile_id
      and (p.payment_status = 'approved' or p.estado::text = 'aprobado')
      and coalesce(p.submitted_at, p.pagado_en, p.validated_at) is not null
  ), gaps as (
    select paid_at, lag(paid_at) over (order by paid_at desc) as newer_paid_at
    from approved_dates
  ), ordered_gaps as (
    select paid_at,
      row_number() over (order by paid_at desc) as rn,
      case when newer_paid_at is null or newer_paid_at - paid_at <= interval '10 days' then 0 else 1 end as broken
    from gaps
  )
  select count(*) into v_streak
  from ordered_gaps
  where rn < coalesce((select min(rn) from ordered_gaps where broken = 1), 2147483647);

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
    ;

  return greatest(0, least(100, round(v_raw_score)))::integer;
end;
$$;

create or replace function public.enforce_junta_creation_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_score integer;
  v_level text;
  v_max_members integer;
  v_max_contribution numeric;
  v_incentives_enabled boolean;
begin
  if auth.uid() is null or new.admin_id <> auth.uid() then
    raise exception using errcode = '42501', message = 'Solo el usuario autenticado puede crear su propia junta.';
  end if;

  v_score := public.current_junta_score(new.admin_id);

  if v_score >= 85 then
    v_level := 'Élite'; v_max_members := 40; v_max_contribution := 3500; v_incentives_enabled := true;
  elsif v_score >= 70 then
    v_level := 'Oro'; v_max_members := 25; v_max_contribution := 2000; v_incentives_enabled := true;
  elsif v_score >= 50 then
    v_level := 'Plata'; v_max_members := 18; v_max_contribution := 1200; v_incentives_enabled := true;
  elsif v_score >= 30 then
    v_level := 'Bronce'; v_max_members := 12; v_max_contribution := 700; v_incentives_enabled := false;
  else
    v_level := 'Nuevo'; v_max_members := 8; v_max_contribution := 400; v_incentives_enabled := false;
  end if;

  if new.participantes_max < 4 or new.participantes_max > v_max_members then
    raise exception using errcode = '23514',
      message = format('Tu nivel %s permite entre 4 y %s integrantes.', v_level, v_max_members);
  end if;

  if new.monto_cuota < 20 or new.monto_cuota > v_max_contribution then
    raise exception using errcode = '23514',
      message = format('Tu nivel %s permite cuotas entre S/ 20 y S/ %s.', v_level, v_max_contribution);
  end if;

  if new.tipo_junta::text = 'incentivo' and not v_incentives_enabled then
    raise exception using errcode = '23514',
      message = format('Las juntas con incentivos requieren nivel Plata o superior. Tu nivel actual es %s.', v_level);
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_junta_creation_limits_trigger on public.juntas;
create trigger enforce_junta_creation_limits_trigger
before insert or update of admin_id, participantes_max, monto_cuota, tipo_junta on public.juntas
for each row execute function public.enforce_junta_creation_limits();

-- These are implementation details used only by the trigger.
revoke all on function public.current_junta_score(uuid) from public, anon, authenticated;
revoke all on function public.enforce_junta_creation_limits() from public, anon, authenticated;
