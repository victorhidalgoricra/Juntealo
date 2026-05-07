-- Fix private code reusability: soft-delete members on leave + allow reactivation on rejoin.
--
-- Problem: leave_junta did a hard DELETE, but join_junta_secure blocked re-entry when
-- the junta had moved to 'activa'. Now:
--   1. leave_junta: UPDATE estado='retirado', orden_turno=NULL (preserves history, frees the slot/turno).
--   2. join_junta_secure: if a 'retirado' row exists, reactivate it (UPDATE) instead of INSERT.
--      Reactivation bypasses the borrador-only guard since the user previously had a valid spot.
--      Only completely new joins (no existing row) require borrador state.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. leave_junta → soft delete
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.leave_junta(p_junta_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_junta public.juntas%rowtype;
  v_uid   uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  select * into v_junta from public.juntas where id = p_junta_id;
  if not found then
    raise exception 'Junta no encontrada';
  end if;

  if v_junta.estado = 'activa' then
    raise exception 'No puedes retirarte de una junta activa.';
  end if;

  if v_junta.admin_id = v_uid then
    raise exception 'El creador no puede retirarse de su propia junta.';
  end if;

  -- Soft delete: mark as retired and free the turn slot so others can take it.
  update public.junta_members
  set estado      = 'retirado',
      orden_turno = null
  where junta_id  = p_junta_id
    and profile_id = v_uid
    and estado     = 'activo';
end;
$$;

revoke all on function public.leave_junta(uuid) from public;
grant execute on function public.leave_junta(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. join_junta_secure → support reactivation of 'retirado' members
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.join_junta_secure(
  p_junta_id     uuid,
  p_access_code  text default null,
  p_invite_token text default null
)
returns public.junta_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid                uuid := auth.uid();
  v_junta              public.juntas%rowtype;
  v_member             public.junta_members%rowtype;
  v_members_count      int;
  v_is_active_member   boolean;
  v_is_retired_member  boolean;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  -- Enforce deadline (may set bloqueada; NEVER changes estado to activa).
  v_junta := public.enforce_junta_activation_deadline(p_junta_id);

  if coalesce(v_junta.bloqueada, false) then
    raise exception 'La junta está bloqueada por no activarse a tiempo.';
  end if;

  if v_junta.cerrar_inscripciones then
    raise exception 'Inscripciones cerradas';
  end if;

  -- Validate private access (code or invite token).
  if v_junta.visibilidad = 'privada' then
    if p_invite_token is not null and p_invite_token::text = v_junta.invite_token::text then
      null; -- valid token
    elsif p_access_code is not null
          and upper(trim(p_access_code)) = upper(trim(v_junta.access_code)) then
      null; -- valid code
    else
      raise exception 'Acceso privado inválido';
    end if;
  end if;

  -- Check if user is already an active member.
  select exists(
    select 1 from public.junta_members
    where junta_id = p_junta_id and profile_id = v_uid and estado = 'activo'
  ) into v_is_active_member;

  if v_is_active_member then
    raise exception 'Ya formas parte de esta junta';
  end if;

  -- Check if user previously left (retirado) — eligible for reactivation.
  select exists(
    select 1 from public.junta_members
    where junta_id = p_junta_id and profile_id = v_uid and estado = 'retirado'
  ) into v_is_retired_member;

  -- Count current active members (capacity check + turno assignment).
  select count(*) into v_members_count
  from public.junta_members
  where junta_id = p_junta_id
    and estado = 'activo';

  if v_members_count >= v_junta.participantes_max then
    raise exception 'La junta ya está completa';
  end if;

  if v_is_retired_member then
    -- Reactivation path: user previously left. Allowed regardless of junta estado since
    -- the user had a prior valid spot. Assign a fresh turno (old one was cleared on leave).
    update public.junta_members
    set estado      = 'activo',
        orden_turno = v_members_count + 1
    where junta_id  = p_junta_id
      and profile_id = v_uid
      and estado     = 'retirado'
    returning * into v_member;

    return v_member;
  end if;

  -- New join path: only allowed while junta is in borrador.
  if v_junta.estado <> 'borrador' then
    raise exception 'Solo puedes unirte a una junta en estado borrador.';
  end if;

  insert into public.junta_members (junta_id, profile_id, estado, rol, orden_turno)
  values (p_junta_id, v_uid, 'activo', 'participante', v_members_count + 1)
  returning * into v_member;

  return v_member;
end;
$$;

revoke all on function public.join_junta_secure(uuid, text, text) from public;
grant execute on function public.join_junta_secure(uuid, text, text) to authenticated;
