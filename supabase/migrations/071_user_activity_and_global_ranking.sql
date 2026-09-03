-- Durable user activity feed and privacy-safe global ranking.

create table if not exists public.user_activity_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('payment_confirmed', 'joined_junta', 'cycle_completed')),
  junta_id uuid references public.juntas(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_user_activity_profile_occurred
  on public.user_activity_events(profile_id, occurred_at desc);
create unique index if not exists idx_user_activity_payment_confirmed
  on public.user_activity_events(payment_id, event_type)
  where payment_id is not null and event_type = 'payment_confirmed';
create unique index if not exists idx_user_activity_junta_profile_type
  on public.user_activity_events(junta_id, profile_id, event_type)
  where junta_id is not null and event_type in ('joined_junta', 'cycle_completed');

alter table public.user_activity_events enable row level security;
drop policy if exists "activity events self read" on public.user_activity_events;
create policy "activity events self read" on public.user_activity_events
  for select using (profile_id = auth.uid());

create or replace function public.record_payment_confirmed_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if (new.payment_status = 'approved' or new.estado::text = 'aprobado')
     and not (coalesce(old.payment_status = 'approved', false) or old.estado::text = 'aprobado') then
    select nombre into v_name from public.juntas where id = new.junta_id;
    insert into public.user_activity_events(profile_id, event_type, junta_id, payment_id, description, metadata, occurred_at)
    values (new.profile_id, 'payment_confirmed', new.junta_id, new.id,
      format('Pagaste tu cuota en %s', coalesce(v_name, 'tu junta')),
      jsonb_build_object('junta_name', coalesce(v_name, 'tu junta')),
      coalesce(new.validated_at, now()))
    on conflict do nothing;
  end if;
  return new;
end; $$;

drop trigger if exists record_payment_confirmed_activity_trigger on public.payments;
create trigger record_payment_confirmed_activity_trigger
after update of estado, payment_status on public.payments
for each row execute function public.record_payment_confirmed_activity();

create or replace function public.record_joined_junta_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if new.estado::text in ('activo', 'moroso')
     and (tg_op = 'INSERT' or old.estado::text not in ('activo', 'moroso')) then
    select nombre into v_name from public.juntas where id = new.junta_id;
    insert into public.user_activity_events(profile_id, event_type, junta_id, description, metadata, occurred_at)
    values (new.profile_id, 'joined_junta', new.junta_id,
      format('Te uniste a %s', coalesce(v_name, 'una junta')),
      jsonb_build_object('junta_name', coalesce(v_name, 'una junta')),
      coalesce(new.created_at, now()))
    on conflict do nothing;
  end if;
  return new;
end; $$;

drop trigger if exists record_joined_junta_activity_trigger on public.junta_members;
create trigger record_joined_junta_activity_trigger
after insert or update of estado on public.junta_members
for each row execute function public.record_joined_junta_activity();

create or replace function public.record_cycle_completed_activity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.estado::text = 'cerrada' and old.estado::text <> 'cerrada' then
    insert into public.user_activity_events(profile_id, event_type, junta_id, description, metadata, occurred_at)
    select participant.profile_id, 'cycle_completed', new.id,
      format('Completaste un ciclo en %s', new.nombre),
      jsonb_build_object('junta_name', new.nombre), now()
    from (
      select new.admin_id as profile_id
      union
      select jm.profile_id from public.junta_members jm
      where jm.junta_id = new.id and jm.estado::text <> 'retirado'
    ) participant
    on conflict do nothing;
  end if;
  return new;
end; $$;

drop trigger if exists record_cycle_completed_activity_trigger on public.juntas;
create trigger record_cycle_completed_activity_trigger
after update of estado on public.juntas
for each row execute function public.record_cycle_completed_activity();

-- Backfill the operational history that has an unambiguous timestamp.
insert into public.user_activity_events(profile_id, event_type, junta_id, payment_id, description, metadata, occurred_at)
select p.profile_id, 'payment_confirmed', p.junta_id, p.id,
  format('Pagaste tu cuota en %s', j.nombre), jsonb_build_object('junta_name', j.nombre),
  coalesce(p.validated_at, p.pagado_en, p.created_at)
from public.payments p join public.juntas j on j.id = p.junta_id
where p.payment_status = 'approved' or p.estado::text = 'aprobado'
on conflict do nothing;

insert into public.user_activity_events(profile_id, event_type, junta_id, description, metadata, occurred_at)
select jm.profile_id, 'joined_junta', jm.junta_id,
  format('Te uniste a %s', j.nombre), jsonb_build_object('junta_name', j.nombre), jm.created_at
from public.junta_members jm join public.juntas j on j.id = jm.junta_id
where jm.estado::text in ('activo', 'moroso')
on conflict do nothing;

-- Global aggregation: only intentionally public display fields leave the function.
create or replace function public.get_global_ranking()
returns table (
  profile_id uuid, display_name text, initials text, score integer,
  level text, position bigint, is_current_user boolean
)
language sql stable security definer set search_path = public as $$
  with scored as (
    select p.id,
      case
        when nullif(trim(p.first_name), '') is not null then trim(p.first_name) ||
          case when nullif(trim(p.paternal_last_name), '') is not null then ' ' || upper(left(trim(p.paternal_last_name), 1)) || '.' else '' end
        when array_length(regexp_split_to_array(trim(p.nombre), '\s+'), 1) > 1 then
          split_part(trim(p.nombre), ' ', 1) || ' ' || upper(left((regexp_split_to_array(trim(p.nombre), '\s+'))[array_length(regexp_split_to_array(trim(p.nombre), '\s+'), 1)], 1)) || '.'
        else coalesce(nullif(trim(p.nombre), ''), 'Miembro')
      end as public_name,
      public.current_junta_score(p.id) as user_score,
      p.created_at
    from public.profiles p
  ), ranked as (
    select *, row_number() over (
      order by user_score desc,
        (select count(*) from public.juntas j where j.estado::text = 'cerrada' and
          (j.admin_id = scored.id or exists (select 1 from public.junta_members jm where jm.junta_id = j.id and jm.profile_id = scored.id and jm.estado::text in ('activo','moroso')))) desc,
        created_at asc, public_name asc
    ) as rank_position
    from scored where user_score > 0
  )
  select id, public_name,
    upper(left(split_part(public_name, ' ', 1), 1) || left(coalesce(nullif(split_part(public_name, ' ', 2), ''), split_part(public_name, ' ', 1)), 1)),
    user_score,
    case when user_score >= 85 then 'Élite' when user_score >= 70 then 'Oro' when user_score >= 50 then 'Plata' when user_score >= 30 then 'Bronce' else 'Nuevo' end,
    rank_position, id = auth.uid()
  from ranked order by rank_position;
$$;

revoke all on function public.get_global_ranking() from public, anon;
grant execute on function public.get_global_ranking() to authenticated;
revoke all on table public.user_activity_events from anon;
grant select on table public.user_activity_events to authenticated;
