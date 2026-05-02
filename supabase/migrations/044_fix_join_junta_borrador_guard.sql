-- Fix: join_junta_secure must NEVER activate a junta.
--
-- Root cause hypothesis: join_junta_secure lacked an explicit estado = 'borrador' check,
-- leaving the door open for a rogue trigger or DB-level modification to auto-activate
-- when a member joins and fills the junta to capacity.
--
-- Fix: add estado = 'borrador' guard so joining is only allowed on draft juntas.
-- The join path NEVER touches juntas.estado — activation is exclusively via
-- activate_junta_if_ready, callable only by the junta's admin.

create or replace function public.join_junta_secure(
  p_junta_id    uuid,
  p_access_code text default null,
  p_invite_token text default null
)
returns public.junta_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid          uuid := auth.uid();
  v_junta        public.juntas%rowtype;
  v_member       public.junta_members%rowtype;
  v_members_count int;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  -- Enforce deadline (may set bloqueada/cerrar_inscripciones; NEVER changes estado to activa).
  v_junta := public.enforce_junta_activation_deadline(p_junta_id);

  if coalesce(v_junta.bloqueada, false) then
    raise exception 'La junta está bloqueada por no activarse a tiempo.';
  end if;

  -- CRITICAL: joining is only allowed while the junta is in draft (borrador).
  -- A junta that is already activa, cerrada, or bloqueada cannot accept new members via this path.
  if v_junta.estado <> 'borrador' then
    raise exception 'Solo puedes unirte a una junta en estado borrador.';
  end if;

  if v_junta.cerrar_inscripciones then
    raise exception 'Inscripciones cerradas';
  end if;

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

  if exists(
    select 1 from public.junta_members
    where junta_id = p_junta_id and profile_id = v_uid
  ) then
    raise exception 'Ya formas parte de esta junta';
  end if;

  select count(*) into v_members_count
  from public.junta_members
  where junta_id = p_junta_id
    and estado = 'activo';

  if v_members_count >= v_junta.participantes_max then
    raise exception 'La junta ya está completa';
  end if;

  -- Insert member only. This function NEVER changes juntas.estado.
  insert into public.junta_members (junta_id, profile_id, estado, rol, orden_turno)
  values (p_junta_id, v_uid, 'activo', 'participante', v_members_count + 1)
  returning * into v_member;

  return v_member;
end;
$$;

revoke all on function public.join_junta_secure(uuid, text, text) from public;
grant execute on function public.join_junta_secure(uuid, text, text) to authenticated;
