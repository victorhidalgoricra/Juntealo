-- Fix: "stack depth limit exceeded" during junta activation.
--
-- Root cause: is_junta_member() and is_junta_admin() (001_init) are NOT SECURITY DEFINER.
-- Chain: junta_members UPDATE → junta_members_update_owner policy → SELECT juntas
--        → "juntas visible for members" policy → is_junta_member() [no definer]
--        → SELECT junta_members (RLS applies) → junta_members_select_co_member_or_owner (036)
--        → EXISTS SELECT juntas → "juntas visible for members" → is_junta_member() → ∞
--
-- Fix 1: SECURITY DEFINER on is_junta_member / is_junta_admin so their internal
--        junta_members reads bypass RLS, breaking the cycle.
--
-- Fix 2: new update_junta_member_turns RPC that reorders turns atomically,
--        preventing unique-constraint violations on (junta_id, orden_turno) when swapping.
--
-- Fix 3: restore turn validation in activate_junta_if_ready (lost in migration 031).

create or replace function public.is_junta_member(_junta_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.junta_members jm
    where jm.junta_id = _junta_id
      and jm.profile_id = auth.uid()
      and jm.estado <> 'retirado'
  );
$$;

create or replace function public.is_junta_admin(_junta_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.junta_members jm
    where jm.junta_id = _junta_id
      and jm.profile_id = auth.uid()
      and jm.rol = 'admin'
  );
$$;

-- Atomically reassign orden_turno for all active members of a junta.
-- Two-step approach to avoid (junta_id, orden_turno) unique constraint violations
-- when swapping turns (e.g. A:1→2, B:2→1):
--   Step 1 – offset all existing turns by (participantes_max + 1) to free target slots.
--   Step 2 – write the new turn values (1..N), which don't overlap with offset values.
create or replace function public.update_junta_member_turns(
  p_junta_id uuid,
  p_turns   jsonb  -- [{profile_id: "uuid", orden_turno: int}, ...]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_junta public.juntas%rowtype;
begin
  select * into v_junta from public.juntas where id = p_junta_id;
  if not found then
    raise exception 'Junta no encontrada';
  end if;

  if v_junta.admin_id <> auth.uid() then
    raise exception 'No autorizado';
  end if;

  -- Step 1: offset current turns to vacate the target slot numbers.
  update public.junta_members
  set orden_turno = orden_turno + v_junta.participantes_max + 1
  where junta_id = p_junta_id and estado = 'activo';

  -- Step 2: apply the new turn assignment.
  update public.junta_members jm
  set orden_turno = (elem->>'orden_turno')::int
  from jsonb_array_elements(p_turns) as elem
  where jm.junta_id = p_junta_id
    and jm.profile_id = (elem->>'profile_id')::uuid;
end;
$$;

revoke all on function public.update_junta_member_turns(uuid, jsonb) from public;
grant execute on function public.update_junta_member_turns(uuid, jsonb) to authenticated;

-- Restore full activate_junta_if_ready: deadline enforcement (031) + turn validation (026).
-- Migration 031 rewrote this function and dropped the per-mode turn logic from 026.
create or replace function public.activate_junta_if_ready(p_junta_id uuid)
returns public.juntas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid          uuid := auth.uid();
  v_junta        public.juntas%rowtype;
  v_active       int;
  v_distinct     int;
  v_min          int;
  v_max          int;
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
    -- Validate that every active member has a unique turn in 1..N.
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
    -- Random mode: assign turns now.
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

  return v_junta;
end;
$$;
