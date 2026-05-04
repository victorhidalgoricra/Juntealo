-- Generate payment_schedules rows when a junta is activated.
-- Previously, schedules were only generated in-memory on the frontend, so
-- submitPayment could never find them in the DB.

-- Internal helper: inserts payment_schedules for a junta (idempotent).
-- Not exposed to authenticated users — only called by activate_junta_if_ready.
create or replace function public.generate_payment_schedules_for_junta(p_junta_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_junta public.juntas%rowtype;
  v_i     int;
  v_fecha date;
begin
  select * into v_junta from public.juntas where id = p_junta_id;
  if not found then
    raise exception 'Junta no encontrada: %', p_junta_id;
  end if;

  -- Idempotent: skip if schedules already exist for this junta
  if exists (select 1 from public.payment_schedules where junta_id = p_junta_id) then
    return;
  end if;

  -- Replicates frontend addFrequencyToDate logic (turnIndex = cuota_numero - 1)
  for v_i in 0..(v_junta.participantes_max - 1) loop
    case v_junta.frecuencia_pago
      when 'semanal'   then v_fecha := v_junta.fecha_inicio + (v_i * 7);
      when 'quincenal' then v_fecha := v_junta.fecha_inicio + (v_i * 14);
      when 'mensual'   then v_fecha := (v_junta.fecha_inicio + (v_i * interval '1 month'))::date;
    end case;

    insert into public.payment_schedules (junta_id, cuota_numero, fecha_vencimiento, monto, estado)
    values (p_junta_id, v_i + 1, v_fecha, v_junta.monto_cuota, 'pendiente');
  end loop;
end;
$$;

-- Block direct RPC calls from authenticated users (internal helper only)
revoke all on function public.generate_payment_schedules_for_junta(uuid) from public;

-- Update activate_junta_if_ready to generate schedules on activation
create or replace function public.activate_junta_if_ready(p_junta_id uuid)
returns public.juntas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_junta    public.juntas%rowtype;
  v_active   int;
  v_distinct int;
  v_min      int;
  v_max      int;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  v_junta := public.enforce_junta_activation_deadline(p_junta_id);

  if coalesce(v_junta.bloqueada, false) then
    raise exception 'La junta fue bloqueada por no activarse a tiempo.';
  end if;

  if v_junta.admin_id <> v_uid then
    raise exception 'No autorizado';
  end if;

  if v_junta.estado <> 'borrador' then
    return v_junta;
  end if;

  select count(*) into v_active
  from public.junta_members
  where junta_id = p_junta_id and estado = 'activo';

  if v_active < v_junta.participantes_max then
    raise exception 'Completa todos los integrantes para activar la junta';
  end if;

  if coalesce(v_junta.turn_assignment_mode, 'random') = 'manual' then
    select
      count(distinct orden_turno),
      min(orden_turno),
      max(orden_turno)
    into v_distinct, v_min, v_max
    from public.junta_members
    where junta_id = p_junta_id and estado = 'activo';

    if v_distinct <> v_active or v_min <> 1 or v_max <> v_active then
      raise exception 'Define un orden manual completo (sin huecos ni duplicados) antes de activar la junta.';
    end if;
  else
    -- Random mode: assign turns at activation time
    update public.junta_members as jm
    set orden_turno = ranked.turno
    from (
      select id, row_number() over (order by random()) as turno
      from public.junta_members
      where junta_id = p_junta_id and estado = 'activo'
    ) ranked
    where ranked.id = jm.id;
  end if;

  update public.juntas
  set estado = 'activa'
  where id = p_junta_id
  returning * into v_junta;

  -- Always generate payment_schedules in DB on activation
  perform public.generate_payment_schedules_for_junta(p_junta_id);

  return v_junta;
end;
$$;

-- Backfill: generate schedules for already-active juntas that have none
do $$
declare
  r record;
begin
  for r in
    select id from public.juntas
    where estado = 'activa'
      and not exists (
        select 1 from public.payment_schedules where junta_id = juntas.id
      )
  loop
    perform public.generate_payment_schedules_for_junta(r.id);
  end loop;
end;
$$;
