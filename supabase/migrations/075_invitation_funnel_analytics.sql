-- Persist membership acquisition source and instrument the invitation funnel.
-- Tokens and access codes are validation-only inputs and are never stored in analytics metadata.

alter table public.junta_members
  add column if not exists join_source text;

update public.junta_members jm
set join_source = case
  when jm.rol = 'admin'
    or exists (
      select 1 from public.juntas j
      where j.id = jm.junta_id and j.admin_id = jm.profile_id
    ) then 'creator'
  else 'unknown'
end
where jm.join_source is null;

alter table public.junta_members
  alter column join_source set default 'unknown';

alter table public.junta_members
  drop constraint if exists junta_members_join_source_check;
alter table public.junta_members
  add constraint junta_members_join_source_check
  check (join_source is null or join_source in (
    'creator', 'invite_link', 'access_code', 'public_catalog', 'direct', 'unknown'
  ));

-- invite_opened can occur before authentication, so profile_id must be nullable.
alter table public.user_activity_events
  alter column profile_id drop not null;

do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.user_activity_events'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%event_type%'
  loop
    execute format('alter table public.user_activity_events drop constraint %I', v_constraint.conname);
  end loop;
end $$;

alter table public.user_activity_events
  add constraint user_activity_events_event_type_check
  check (event_type in (
    'junta_created',
    'invite_link_copied',
    'access_code_copied',
    'whatsapp_share_clicked',
    'invite_opened',
    'signup_completed',
    'joined_junta',
    'junta_full',
    'payment_confirmed',
    'cycle_completed'
  ));

-- The old index suppressed legitimate rejoin events. Trigger transitions are already
-- retry-safe because only INSERT or an inactive -> active transition emits an event.
drop index if exists public.idx_user_activity_junta_profile_type;
create index if not exists idx_user_activity_junta_occurred
  on public.user_activity_events(junta_id, occurred_at);
create unique index if not exists idx_user_activity_junta_created
  on public.user_activity_events(junta_id)
  where junta_id is not null and event_type = 'junta_created';
create unique index if not exists idx_user_activity_junta_full
  on public.user_activity_events(junta_id)
  where junta_id is not null and event_type = 'junta_full';
create unique index if not exists idx_user_activity_signup_from_junta
  on public.user_activity_events(junta_id, profile_id)
  where junta_id is not null and profile_id is not null and event_type = 'signup_completed';
create unique index if not exists idx_user_activity_invite_open_id
  on public.user_activity_events(event_type, (metadata ->> 'open_id'))
  where event_type = 'invite_opened' and metadata ? 'open_id';

-- Backfill only events with an unambiguous operational timestamp.
insert into public.user_activity_events(
  profile_id, event_type, junta_id, description, metadata, occurred_at
)
select
  j.admin_id, 'junta_created', j.id, format('Creaste %s', j.nombre),
  jsonb_build_object(
    'junta_name', j.nombre,
    'visibility', j.visibilidad,
    'participants_max', j.participantes_max,
    'amount', j.monto_cuota,
    'frequency', j.frecuencia_pago
  ),
  j.created_at
from public.juntas j
on conflict do nothing;

update public.user_activity_events e
set metadata = e.metadata || jsonb_build_object('join_source', coalesce(jm.join_source, 'unknown'))
from public.junta_members jm
where e.event_type = 'joined_junta'
  and e.junta_id = jm.junta_id
  and e.profile_id = jm.profile_id
  and not (e.metadata ? 'join_source');

insert into public.user_activity_events(
  profile_id, event_type, junta_id, description, metadata, occurred_at
)
select
  last_member.profile_id,
  'junta_full',
  j.id,
  format('%s alcanzó el número máximo de integrantes', j.nombre),
  jsonb_build_object('junta_name', j.nombre, 'participants_max', j.participantes_max),
  last_member.created_at
from public.juntas j
cross join lateral (
  select jm.profile_id, jm.created_at
  from public.junta_members jm
  where jm.junta_id = j.id and jm.estado::text in ('activo', 'moroso')
  order by jm.created_at asc
  offset greatest(j.participantes_max - 1, 0)
  limit 1
) last_member
where (
  select count(*) from public.junta_members jm
  where jm.junta_id = j.id and jm.estado::text in ('activo', 'moroso')
) >= j.participantes_max
on conflict do nothing;

-- Record creation before inserting the creator membership so the event chronology is stable.
create or replace function public.ensure_creator_membership_on_junta_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_activity_events(
    profile_id, event_type, junta_id, description, metadata, occurred_at
  ) values (
    new.admin_id,
    'junta_created',
    new.id,
    format('Creaste %s', new.nombre),
    jsonb_build_object(
      'junta_name', new.nombre,
      'visibility', new.visibilidad,
      'participants_max', new.participantes_max,
      'amount', new.monto_cuota,
      'frequency', new.frecuencia_pago
    ),
    coalesce(new.created_at, now())
  ) on conflict do nothing;

  insert into public.junta_members (
    junta_id, profile_id, estado, rol, orden_turno, join_source
  ) values (
    new.id, new.admin_id, 'activo', 'admin', 1, 'creator'
  )
  on conflict (junta_id, profile_id)
  do update set
    estado = 'activo',
    rol = 'admin',
    orden_turno = coalesce(public.junta_members.orden_turno, excluded.orden_turno),
    join_source = 'creator';

  return new;
end;
$$;

create or replace function public.record_joined_junta_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_join_source text := coalesce(new.join_source, 'unknown');
  v_active_count integer;
  v_participants_max integer;
begin
  if new.estado::text in ('activo', 'moroso')
     and (tg_op = 'INSERT' or old.estado::text not in ('activo', 'moroso')) then
    select nombre, participantes_max
      into v_name, v_participants_max
    from public.juntas
    where id = new.junta_id;

    insert into public.user_activity_events(
      profile_id, event_type, junta_id, description, metadata, occurred_at
    ) values (
      new.profile_id,
      'joined_junta',
      new.junta_id,
      format('Te uniste a %s', coalesce(v_name, 'una junta')),
      jsonb_build_object(
        'junta_name', coalesce(v_name, 'una junta'),
        'join_source', v_join_source
      ),
      case when tg_op = 'INSERT' then coalesce(new.created_at, now()) else now() end
    );

    select count(*) into v_active_count
    from public.junta_members
    where junta_id = new.junta_id and estado::text in ('activo', 'moroso');

    if v_active_count >= v_participants_max then
      insert into public.user_activity_events(
        profile_id, event_type, junta_id, description, metadata, occurred_at
      ) values (
        new.profile_id,
        'junta_full',
        new.junta_id,
        format('%s alcanzó el número máximo de integrantes', coalesce(v_name, 'La junta')),
        jsonb_build_object(
          'junta_name', coalesce(v_name, 'La junta'),
          'participants_max', v_participants_max
        ),
        now()
      ) on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists record_joined_junta_activity_trigger on public.junta_members;
create trigger record_joined_junta_activity_trigger
after insert or update of estado on public.junta_members
for each row execute function public.record_joined_junta_activity();

create or replace function public.join_junta_secure(
  p_junta_id uuid,
  p_access_code text default null,
  p_invite_token text default null
)
returns public.junta_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_junta public.juntas%rowtype;
  v_member public.junta_members%rowtype;
  v_members_count integer;
  v_next_turno integer;
  v_is_active_member boolean;
  v_is_retired_member boolean;
  v_join_source text := 'unknown';
begin
  if v_uid is null then raise exception 'No autenticado'; end if;

  v_junta := public.enforce_junta_activation_deadline(p_junta_id);
  -- Serialize capacity checks and re-read any state changed by the deadline guard.
  select * into v_junta from public.juntas where id = p_junta_id for update;
  if not found then raise exception 'Junta no encontrada'; end if;
  if coalesce(v_junta.bloqueada, false) then
    raise exception 'La junta está bloqueada por no activarse a tiempo.';
  end if;
  if v_junta.cerrar_inscripciones then raise exception 'Inscripciones cerradas'; end if;

  -- Token wins when both valid credentials are present. The client cannot override this.
  if p_invite_token is not null
     and p_invite_token::text = v_junta.invite_token::text then
    v_join_source := 'invite_link';
  elsif p_access_code is not null
        and upper(trim(p_access_code)) = upper(trim(v_junta.access_code)) then
    v_join_source := 'access_code';
  elsif v_junta.visibilidad = 'privada' then
    raise exception 'Acceso privado inválido';
  end if;

  select exists(
    select 1 from public.junta_members
    where junta_id = p_junta_id and profile_id = v_uid and estado = 'activo'
  ) into v_is_active_member;
  if v_is_active_member then raise exception 'Ya formas parte de esta junta'; end if;

  select exists(
    select 1 from public.junta_members
    where junta_id = p_junta_id and profile_id = v_uid and estado = 'retirado'
  ) into v_is_retired_member;

  select count(*) into v_members_count
  from public.junta_members
  where junta_id = p_junta_id and estado = 'activo';
  if v_members_count >= v_junta.participantes_max then
    raise exception 'La junta ya está completa';
  end if;

  if v_is_retired_member then
    update public.junta_members
    set estado = 'activo', left_at = null, join_source = v_join_source
    where junta_id = p_junta_id and profile_id = v_uid and estado = 'retirado'
    returning * into v_member;
    return v_member;
  end if;

  if v_junta.estado <> 'borrador' then
    raise exception 'Solo puedes unirte a una junta en estado borrador.';
  end if;

  select coalesce(max(orden_turno), 0) + 1 into v_next_turno
  from public.junta_members where junta_id = p_junta_id;

  insert into public.junta_members(
    junta_id, profile_id, estado, rol, orden_turno, join_source
  ) values (
    p_junta_id, v_uid, 'activo', 'participante', v_next_turno, v_join_source
  ) returning * into v_member;
  return v_member;
end;
$$;

revoke all on function public.join_junta_secure(uuid, text, text) from public;
grant execute on function public.join_junta_secure(uuid, text, text) to authenticated;

-- Resolve and record a valid invite in one backend call. No token is returned or persisted.
create or replace function public.open_junta_invite(
  p_invite_token text,
  p_open_id uuid
)
returns table (
  junta_id uuid,
  nombre text,
  descripcion text,
  visibilidad text,
  tipo_junta text,
  participantes_max integer,
  monto_cuota numeric,
  cuota_base numeric,
  frecuencia_pago text,
  fecha_inicio date,
  estado text,
  integrantes_actuales bigint,
  bloqueada boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_junta public.juntas%rowtype;
begin
  if p_invite_token is null or p_open_id is null then return; end if;
  select * into v_junta
  from public.juntas j
  where j.invite_token::text = p_invite_token
    and j.estado::text in ('borrador', 'activa')
    and coalesce(j.bloqueada, false) = false;
  if not found then return; end if;

  insert into public.user_activity_events(
    profile_id, event_type, junta_id, description, metadata
  ) values (
    auth.uid(),
    'invite_opened',
    v_junta.id,
    format('Se abrió una invitación a %s', v_junta.nombre),
    jsonb_build_object('source', 'invite_link', 'open_id', p_open_id)
  ) on conflict do nothing;

  return query
  select v_junta.id, v_junta.nombre, v_junta.descripcion,
    v_junta.visibilidad::text, v_junta.tipo_junta::text,
    v_junta.participantes_max, v_junta.monto_cuota, v_junta.cuota_base,
    v_junta.frecuencia_pago::text, v_junta.fecha_inicio, v_junta.estado::text,
    (select count(*) from public.junta_members jm
      where jm.junta_id = v_junta.id and jm.estado::text in ('activo', 'moroso')),
    coalesce(v_junta.bloqueada, false);
end;
$$;

revoke all on function public.open_junta_invite(text, uuid) from public;
grant execute on function public.open_junta_invite(text, uuid) to anon, authenticated;

create or replace function public.record_junta_invite_interaction(
  p_junta_id uuid,
  p_event_type text,
  p_source text default 'junta_detail'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  if p_event_type not in ('invite_link_copied', 'access_code_copied', 'whatsapp_share_clicked') then
    raise exception 'Tipo de evento de invitación inválido';
  end if;
  if p_source <> 'junta_detail' then
    raise exception 'Fuente de interacción inválida';
  end if;
  select j.nombre into v_name
  from public.juntas j
  where j.id = p_junta_id
    and (
      j.admin_id = v_uid
      or exists (
        select 1 from public.junta_members jm
        where jm.junta_id = j.id and jm.profile_id = v_uid
          and jm.estado::text in ('activo', 'moroso')
      )
    );
  if not found then raise exception 'No tienes acceso a esta junta'; end if;

  insert into public.user_activity_events(
    profile_id, event_type, junta_id, description, metadata
  ) values (
    v_uid, p_event_type, p_junta_id,
    format('Interacción de invitación en %s', v_name),
    jsonb_build_object('source', coalesce(nullif(trim(p_source), ''), 'junta_detail'))
  );
end;
$$;

revoke all on function public.record_junta_invite_interaction(uuid, text, text) from public;
grant execute on function public.record_junta_invite_interaction(uuid, text, text) to authenticated;

create or replace function public.record_signup_from_junta_invite(
  p_junta_id uuid,
  p_invite_token text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  select nombre into v_name from public.juntas
  where id = p_junta_id and invite_token::text = p_invite_token;
  if not found then raise exception 'Invitación inválida'; end if;

  insert into public.user_activity_events(
    profile_id, event_type, junta_id, description, metadata
  ) values (
    v_uid, 'signup_completed', p_junta_id,
    format('Completaste tu registro desde una invitación a %s', v_name),
    jsonb_build_object('source', 'invite_link', 'junta_id', p_junta_id)
  ) on conflict do nothing;
end;
$$;

revoke all on function public.record_signup_from_junta_invite(uuid, text) from public;
grant execute on function public.record_signup_from_junta_invite(uuid, text) to authenticated;
