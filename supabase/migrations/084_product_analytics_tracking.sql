-- First-party product analytics on the existing activity table.
-- Operational tables remain the source of truth; these rows are immutable facts.

alter table public.user_activity_events
  alter column profile_id drop not null,
  alter column description set default '',
  add column if not exists event_key text,
  add column if not exists source text not null default 'database_trigger',
  add column if not exists event_version integer not null default 1,
  add column if not exists cycle_id uuid references public.payment_schedules(id) on delete set null,
  add column if not exists invite_id uuid references public.invitations(id) on delete set null,
  add column if not exists notification_id uuid references public.notifications(id) on delete set null;

-- The legacy CHECK must be removed before joined_junta can be renamed.
alter table public.user_activity_events
  drop constraint if exists user_activity_events_event_type_check;

-- Normalize and canonicalize the legacy feed without deleting feed rows.  The
-- canonical row gets the unique analytics key; conceptual duplicates remain
-- readable in the historical feed with a null event_key.
--
-- A junta member's created_at and a payment's validation/payment timestamp are
-- preferred over event timestamps.  Ties are resolved by occurred_at,
-- created_at and id, in that order.
with ranked as (
  select e.id,
    row_number() over (
      partition by e.junta_id, e.profile_id
      order by
        exists (
          select 1 from public.junta_members jm
          where jm.junta_id = e.junta_id and jm.profile_id = e.profile_id
            and jm.created_at = e.occurred_at
        ) desc,
        e.occurred_at, e.created_at, e.id
    ) as canonical_rank
  from public.user_activity_events e
  where e.event_type in ('joined_junta', 'junta_joined')
    and e.junta_id is not null and e.profile_id is not null
)
update public.user_activity_events e
set event_type = 'junta_joined',
    event_key = case when r.canonical_rank = 1
      then 'junta_joined:' || e.junta_id || ':' || e.profile_id end,
    metadata = e.metadata - 'junta_name',
    source = 'database_trigger'
from ranked r where r.id = e.id;

-- Rows lacking either identity cannot safely claim a junta_joined key, but the
-- valid historical feed record is retained and its legacy type is normalized.
update public.user_activity_events
set event_type = 'junta_joined', event_key = null,
    metadata = metadata - 'junta_name', source = 'database_trigger'
where event_type = 'joined_junta';

with ranked as (
  select e.id,
    row_number() over (
      partition by e.payment_id
      order by
        (coalesce(p.validated_at, p.pagado_en, p.created_at) is not null
          and e.occurred_at = coalesce(p.validated_at, p.pagado_en, p.created_at)) desc,
        e.occurred_at, e.created_at, e.id
    ) as canonical_rank
  from public.user_activity_events e
  join public.payments p on p.id = e.payment_id
  where e.event_type = 'payment_confirmed' and e.payment_id is not null
)
update public.user_activity_events e
set event_key = case when r.canonical_rank = 1
      then 'payment_confirmed:' || e.payment_id end,
    metadata = e.metadata - 'junta_name',
    source = 'database_trigger'
from ranked r where r.id = e.id;

-- The old junta trigger emitted one cycle_completed feed row per participant
-- when the junta closed.  They are junta-completion feed entries, not payment
-- cycle facts.  Preserve every row, but give only one deterministic row the
-- operational junta_completed key.
with ranked as (
  select e.id,
    row_number() over (
      partition by e.junta_id
      order by (e.profile_id = j.admin_id) desc,
        e.occurred_at, e.created_at, e.id
    ) as canonical_rank
  from public.user_activity_events e
  join public.juntas j on j.id = e.junta_id
  where e.event_type = 'cycle_completed' and e.cycle_id is null
)
update public.user_activity_events e
set event_type = 'junta_completed',
    event_key = case when r.canonical_rank = 1
      then 'junta_completed:' || e.junta_id end,
    metadata = e.metadata - 'junta_name',
    source = 'database_trigger'
from ranked r where r.id = e.id;

-- A deleted junta may have nulled junta_id through the legacy foreign key.
-- Such a pre-analytics row is still known to be the old mislabeled feed event,
-- but it cannot safely receive an operational key.
update public.user_activity_events
set event_type = 'junta_completed', event_key = null,
    metadata = metadata - 'junta_name', source = 'database_trigger'
where event_type = 'cycle_completed' and cycle_id is null;

-- Be defensive about a prior partial run (or pre-existing client keys): retain
-- one deterministic owner for every key so the partial unique index can be
-- installed without discarding any historical event.
with ranked as (
  select id, row_number() over (
    partition by event_key order by occurred_at, created_at, id
  ) as canonical_rank
  from public.user_activity_events where event_key is not null
)
update public.user_activity_events e set event_key = null
from ranked r where r.id = e.id and r.canonical_rank > 1;

-- Fail closed on an unknown type.  Unknown history must be investigated, not
-- silently coerced merely to make the CHECK pass.
do $$
declare v_invalid_types text;
begin
  select string_agg(event_type, ', ' order by event_type)
  into v_invalid_types
  from (
    select distinct event_type from public.user_activity_events
    where event_type not in (
      'user_registered',
      'junta_creation_started', 'junta_created',
      'junta_invite_created', 'junta_invite_link_opened', 'junta_invite_accepted',
      'junta_join_requested', 'junta_joined', 'junta_member_removed', 'junta_member_left',
      'junta_first_member_joined', 'junta_filled',
      'junta_activation_started', 'junta_activated',
      'cycle_started', 'cycle_completed',
      'payment_started', 'payment_submitted', 'payment_pending_validation',
      'payment_confirmed', 'payment_rejected', 'payment_overdue',
      'payout_started', 'payout_completed',
      'junta_completed', 'junta_cancelled',
      'explore_viewed', 'junta_viewed', 'create_junta_cta_clicked', 'join_junta_cta_clicked',
      'notification_created', 'notification_sent', 'notification_read', 'reminder_sent',
      'payment_reminder_sent'
    )
  ) invalid;
  if v_invalid_types is not null then
    raise exception 'Unknown user_activity_events event_type(s): %', v_invalid_types;
  end if;
end $$;

alter table public.user_activity_events
  add constraint user_activity_events_event_type_check check (event_type in (
    'user_registered',
    'junta_creation_started', 'junta_created',
    'junta_invite_created', 'junta_invite_link_opened', 'junta_invite_accepted',
    'junta_join_requested', 'junta_joined', 'junta_member_removed', 'junta_member_left',
    'junta_first_member_joined', 'junta_filled',
    'junta_activation_started', 'junta_activated',
    'cycle_started', 'cycle_completed',
    'payment_started', 'payment_submitted', 'payment_pending_validation',
    'payment_confirmed', 'payment_rejected', 'payment_overdue',
    'payout_started', 'payout_completed',
    'junta_completed', 'junta_cancelled',
    'explore_viewed', 'junta_viewed', 'create_junta_cta_clicked', 'join_junta_cta_clicked',
    'notification_created', 'notification_sent', 'notification_read', 'reminder_sent',
    'payment_reminder_sent'
  ));

alter table public.user_activity_events
  drop constraint if exists user_activity_events_source_check;
alter table public.user_activity_events
  add constraint user_activity_events_source_check check (source in (
    'web', 'mobile_web', 'backend', 'database_trigger', 'cron', 'rpc', 'email', 'notification'
  ));

alter table public.user_activity_events
  drop constraint if exists user_activity_events_event_version_check;
alter table public.user_activity_events
  add constraint user_activity_events_event_version_check check (event_version > 0);

alter table public.juntas
  add column if not exists first_member_joined_at timestamptz,
  add column if not exists first_filled_at timestamptz,
  add column if not exists activated_at timestamptz,
  add column if not exists completed_at timestamptz;

drop index if exists public.idx_user_activity_profile_occurred;
drop index if exists public.idx_user_activity_junta_profile_type;
create unique index if not exists idx_user_activity_event_key
  on public.user_activity_events(event_key) where event_key is not null;
create index if not exists idx_user_activity_type_occurred
  on public.user_activity_events(event_type, occurred_at desc);
create index if not exists idx_user_activity_junta_type_occurred
  on public.user_activity_events(junta_id, event_type, occurred_at desc)
  where junta_id is not null;
create index if not exists idx_user_activity_profile_type_occurred
  on public.user_activity_events(profile_id, event_type, occurred_at desc)
  where profile_id is not null;

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
    coalesce(p_metadata, '{}'::jsonb),
    coalesce(p_occurred_at, now()), p_source, p_event_key, 1
  )
  on conflict (event_key) where event_key is not null do nothing
  returning id into v_id;

  if v_id is null and p_event_key is not null then
    select id into v_id from public.user_activity_events where event_key = p_event_key;
  end if;
  return v_id;
end;
$$;

revoke all on function public.record_product_event(text,text,uuid,uuid,uuid,uuid,uuid,uuid,text,jsonb,timestamptz,text)
  from public, anon, authenticated;

-- Narrow client entry point. Business events are intentionally not accepted here.
create or replace function public.track_product_event(
  p_event_name text,
  p_junta_id uuid default null,
  p_payment_id uuid default null,
  p_cycle_id uuid default null,
  p_invite_id uuid default null,
  p_source text default 'web',
  p_metadata jsonb default '{}'::jsonb,
  p_event_key text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  if p_event_name not in (
    'junta_creation_started', 'junta_activation_started', 'payment_started',
    'explore_viewed', 'junta_viewed', 'create_junta_cta_clicked',
    'join_junta_cta_clicked', 'junta_invite_link_opened'
  ) then raise exception 'Evento no permitido desde cliente'; end if;
  if p_source not in ('web', 'mobile_web') then raise exception 'Source de cliente inválido'; end if;

  return public.record_product_event(
    p_event_name, p_event_key, v_uid, p_junta_id, p_payment_id, p_cycle_id,
    p_invite_id, null, p_source, p_metadata, now(), ''
  );
end;
$$;
revoke all on function public.track_product_event(text,uuid,uuid,uuid,uuid,text,jsonb,text) from public, anon;
grant execute on function public.track_product_event(text,uuid,uuid,uuid,uuid,text,jsonb,text) to authenticated;

create or replace function public.analytics_profile_event_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.record_product_event(
    'user_registered', 'user_registered:' || new.id, new.id, p_source := 'database_trigger',
    p_metadata := jsonb_build_object(
      'acquisition_source', 'unknown',
      'referral_code_present', false,
      'registration_channel', 'web'
    ), p_occurred_at := new.created_at
  );
  return new;
end;
$$;
drop trigger if exists analytics_profile_event on public.profiles;
create trigger analytics_profile_event after insert on public.profiles
for each row execute function public.analytics_profile_event_trigger();

create or replace function public.analytics_referral_event_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.user_activity_events
  set metadata = metadata || jsonb_build_object(
    'acquisition_source', 'referral', 'referral_code_present', true
  )
  where event_key = 'user_registered:' || new.referred_id;
  return new;
end;
$$;
drop trigger if exists analytics_referral_event on public.referrals;
create trigger analytics_referral_event after insert on public.referrals
for each row execute function public.analytics_referral_event_trigger();

create or replace function public.analytics_junta_event_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_participants integer;
  v_cycles integer;
  v_volume numeric;
  v_occurred_at timestamptz;
begin
  if tg_op = 'INSERT' then
    perform public.record_product_event(
      'junta_created', 'junta_created:' || new.id, new.admin_id, new.id,
      p_source := 'database_trigger',
      p_metadata := jsonb_build_object(
        'visibility', new.visibilidad::text,
        'frequency', new.frecuencia_pago::text,
        'participant_capacity', new.participantes_max,
        'currency', new.moneda,
        'amount', new.monto_cuota,
        'creation_source', 'web'
      ), p_occurred_at := new.created_at
    );
    return new;
  end if;

  if new.estado::text = 'activa' and old.estado::text <> 'activa' then
    select count(*) into v_participants from public.junta_members
      where junta_id = new.id and estado::text in ('activo','moroso');
    v_cycles := new.participantes_max;
    v_occurred_at := coalesce(new.activated_at, now());
    update public.juntas set activated_at = v_occurred_at
      where id = new.id and activated_at is null;
    perform public.record_product_event(
      'junta_activated', 'junta_activated:' || new.id, new.admin_id, new.id,
      p_source := 'database_trigger',
      p_metadata := jsonb_build_object(
        'participant_count', v_participants, 'cycle_count', v_cycles,
        'activation_source', 'creator_action'
      ), p_occurred_at := v_occurred_at
    );
  end if;

  if new.estado::text = 'cerrada' and old.estado::text <> 'cerrada' then
    select count(*), coalesce(sum(monto_pozo), 0) into v_cycles, v_volume
      from public.payouts where junta_id = new.id and entregado_en is not null;
    select count(*) into v_participants from public.junta_members
      where junta_id = new.id and estado::text in ('activo','moroso');
    v_occurred_at := coalesce(new.completed_at, now());
    update public.juntas set completed_at = v_occurred_at
      where id = new.id and completed_at is null;
    perform public.record_product_event(
      'junta_completed', 'junta_completed:' || new.id, new.admin_id, new.id,
      p_source := 'database_trigger',
      p_metadata := jsonb_build_object(
        'cycles_completed', v_cycles, 'total_volume', v_volume,
        'participant_count', v_participants
      ), p_occurred_at := v_occurred_at
    );
  end if;

  if (new.estado::text in ('eliminada', 'bloqueada')
      and old.estado::text not in ('eliminada', 'bloqueada'))
     or (coalesce(new.bloqueada, false) and not coalesce(old.bloqueada, false)) then
    perform public.record_product_event(
      'junta_cancelled', 'junta_cancelled:' || new.id, new.admin_id, new.id,
      p_source := 'database_trigger',
      p_metadata := jsonb_build_object(
        'lifecycle_stage', old.estado::text,
        'cancellation_reason_code', case when new.estado::text = 'bloqueada' or coalesce(new.bloqueada, false)
          then 'activation_deadline' else 'creator_cancelled' end
      ), p_occurred_at := coalesce(new.deleted_at, now())
    );
  end if;
  return new;
end;
$$;
drop trigger if exists analytics_junta_event on public.juntas;
create trigger analytics_junta_event
after insert or update of estado, bloqueada on public.juntas
for each row execute function public.analytics_junta_event_trigger();

create or replace function public.analytics_member_event_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_junta public.juntas%rowtype;
  v_count integer;
  v_is_join boolean;
  v_is_leave boolean;
  v_actor uuid := auth.uid();
begin
  select * into v_junta from public.juntas where id = new.junta_id for update;
  v_is_join := new.estado::text in ('activo','moroso') and
    (tg_op = 'INSERT' or old.estado::text not in ('activo','moroso'));
  v_is_leave := tg_op = 'UPDATE' and new.estado::text = 'retirado'
    and old.estado::text <> 'retirado';

  if v_is_join and new.profile_id <> v_junta.admin_id then
    perform public.record_product_event(
      'junta_joined', 'junta_joined:' || new.junta_id || ':' || new.profile_id,
      new.profile_id, new.junta_id, p_source := 'database_trigger',
      p_metadata := jsonb_build_object('join_source', 'other'),
      p_occurred_at := new.created_at
    );
  end if;

  if v_is_join then
    select count(*) into v_count from public.junta_members
      where junta_id = new.junta_id and estado::text in ('activo','moroso');

    if new.profile_id <> v_junta.admin_id and v_junta.first_member_joined_at is null then
      update public.juntas set first_member_joined_at = coalesce(new.created_at, now())
        where id = new.junta_id and first_member_joined_at is null;
      perform public.record_product_event(
        'junta_first_member_joined', 'junta_first_member_joined:' || new.junta_id,
        new.profile_id, new.junta_id, p_source := 'database_trigger',
        p_metadata := jsonb_build_object('participant_count', v_count),
        p_occurred_at := new.created_at
      );
    end if;

    if v_count >= v_junta.participantes_max and v_junta.first_filled_at is null then
      update public.juntas set first_filled_at = now()
        where id = new.junta_id and first_filled_at is null;
      perform public.record_product_event(
        'junta_filled', 'junta_filled:' || new.junta_id,
        new.profile_id, new.junta_id, p_source := 'database_trigger',
        p_metadata := jsonb_build_object(
          'participant_count', v_count, 'participant_capacity', v_junta.participantes_max
        )
      );
    end if;
  end if;

  if v_is_leave then
    perform public.record_product_event(
      case when v_actor = new.profile_id then 'junta_member_left' else 'junta_member_removed' end,
      case when v_actor = new.profile_id then 'junta_member_left:' else 'junta_member_removed:' end
        || new.junta_id || ':' || new.profile_id,
      new.profile_id, new.junta_id, p_source := 'database_trigger',
      p_metadata := case when v_actor = new.profile_id
        then '{}'::jsonb
        else jsonb_build_object('removed_by', v_actor, 'reason_code', 'creator_removed') end,
      p_occurred_at := coalesce(new.left_at, now())
    );
  end if;
  return new;
end;
$$;
drop trigger if exists record_joined_junta_activity_trigger on public.junta_members;
drop trigger if exists analytics_member_event on public.junta_members;
create trigger analytics_member_event after insert or update of estado on public.junta_members
for each row execute function public.analytics_member_event_trigger();

create or replace function public.analytics_payment_event_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_was_confirmed boolean := false;
  v_is_confirmed boolean;
  v_was_rejected boolean := false;
  v_is_rejected boolean;
  v_due date;
  v_paid_at timestamptz;
  v_deadline timestamptz;
  v_receiver uuid;
begin
  if tg_op = 'UPDATE' then
    v_was_confirmed := coalesce(old.payment_status = 'approved', false) or old.estado::text = 'aprobado';
    v_was_rejected := coalesce(old.payment_status = 'rejected', false) or old.estado::text = 'rechazado';
  end if;
  v_is_confirmed := coalesce(new.payment_status = 'approved', false) or new.estado::text = 'aprobado';
  v_is_rejected := coalesce(new.payment_status = 'rejected', false) or new.estado::text = 'rechazado';

  if (tg_op = 'INSERT' or coalesce(old.submitted_at, old.pagado_en) is distinct from coalesce(new.submitted_at, new.pagado_en))
     and (new.payment_status in ('submitted','validating') or new.estado::text in ('pendiente_aprobacion','validando')) then
    perform public.record_product_event(
      'payment_submitted', 'payment_submitted:' || new.id, new.profile_id, new.junta_id,
      new.id, new.schedule_id, p_source := 'database_trigger',
      p_metadata := jsonb_build_object(
        'expected_amount', coalesce(new.expected_amount, new.monto),
        'submitted_amount', coalesce(new.submitted_amount, new.monto)
      ), p_occurred_at := coalesce(new.submitted_at, new.pagado_en, now())
    );
  end if;

  if v_is_confirmed and not v_was_confirmed then
    select fecha_vencimiento into v_due from public.payment_schedules where id = new.schedule_id;
    v_paid_at := coalesce(new.submitted_at, new.pagado_en, new.validated_at, now());
    v_deadline := v_due::timestamptz + interval '1 day';
    select jm.profile_id into v_receiver from public.payment_schedules ps
      join public.junta_members jm on jm.junta_id = ps.junta_id and jm.orden_turno = ps.cuota_numero
      where ps.id = new.schedule_id and jm.estado::text <> 'retirado' limit 1;
    perform public.record_product_event(
      'payment_confirmed', 'payment_confirmed:' || new.id, new.profile_id, new.junta_id,
      new.id, new.schedule_id, p_source := 'database_trigger',
      p_metadata := jsonb_build_object(
        'expected_amount', coalesce(new.expected_amount, new.monto),
        'confirmed_amount', coalesce(new.submitted_amount, new.monto),
        'due_date', v_due,
        'payment_date', v_paid_at,
        'is_on_time', v_paid_at < v_deadline,
        'hours_late', greatest(extract(epoch from (v_paid_at - v_deadline)) / 3600.0, 0),
        'receiver_user_id', v_receiver
      ), p_occurred_at := coalesce(new.validated_at, now())
    );
  end if;

  if v_is_rejected and not v_was_rejected then
    perform public.record_product_event(
      'payment_rejected', 'payment_rejected:' || new.id, new.profile_id, new.junta_id,
      new.id, new.schedule_id, p_source := 'database_trigger',
      p_metadata := jsonb_build_object('reason_code', 'validation_rejected'),
      p_occurred_at := coalesce(new.validated_at, now())
    );
  end if;
  return new;
end;
$$;
drop trigger if exists record_payment_confirmed_activity_trigger on public.payments;
drop trigger if exists analytics_payment_event on public.payments;
create trigger analytics_payment_event after insert or update of estado, payment_status, submitted_at on public.payments
for each row execute function public.analytics_payment_event_trigger();

create or replace function public.analytics_payout_event_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_cycle uuid;
  v_expected numeric;
  v_expected_payments integer;
  v_confirmed_payments integer;
  v_confirmed_amount numeric;
begin
  if new.entregado_en is null or (tg_op = 'UPDATE' and old.entregado_en is not null) then return new; end if;
  select ps.id, ps.monto * greatest(j.participantes_max - 1, 0)
    into v_cycle, v_expected
    from public.payment_schedules ps join public.juntas j on j.id = ps.junta_id
    where ps.junta_id = new.junta_id and ps.cuota_numero = new.ronda_numero;
  select greatest(count(*) - 1, 0) into v_expected_payments from public.junta_members
    where junta_id = new.junta_id and estado::text in ('activo','moroso');
  select count(*), coalesce(sum(coalesce(submitted_amount, monto)), 0)
    into v_confirmed_payments, v_confirmed_amount from public.payments
    where junta_id = new.junta_id and schedule_id = v_cycle
      and (payment_status = 'approved' or estado::text = 'aprobado');

  perform public.record_product_event(
    'payout_completed', 'payout_completed:' || new.id, new.profile_id, new.junta_id,
    p_cycle_id := v_cycle, p_source := 'database_trigger',
    p_metadata := jsonb_build_object('expected_amount', v_expected, 'actual_amount', new.monto_pozo),
    p_occurred_at := new.entregado_en
  );
  if v_cycle is not null then
    perform public.record_product_event(
      'cycle_completed', 'cycle_completed:' || v_cycle, new.profile_id, new.junta_id,
      p_cycle_id := v_cycle, p_source := 'database_trigger',
      p_metadata := jsonb_build_object(
        'cycle_number', new.ronda_numero, 'expected_payments', v_expected_payments,
        'confirmed_payments', v_confirmed_payments, 'total_confirmed_amount', v_confirmed_amount
      ), p_occurred_at := new.entregado_en
    );
  end if;
  return new;
end;
$$;
drop trigger if exists analytics_payout_event on public.payouts;
create trigger analytics_payout_event after insert or update of entregado_en on public.payouts
for each row execute function public.analytics_payout_event_trigger();

create or replace function public.analytics_invitation_event_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.record_product_event(
      'junta_invite_created', 'junta_invite_created:' || new.id, new.enviado_por,
      new.junta_id, p_invite_id := new.id, p_source := 'database_trigger',
      p_metadata := jsonb_build_object('invitation_channel', case when new.email is not null then 'email' else 'mobile' end),
      p_occurred_at := new.created_at
    );
  elsif new.estado::text = 'aceptada' and old.estado::text <> 'aceptada' then
    perform public.record_product_event(
      'junta_invite_accepted', 'junta_invite_accepted:' || new.id, new.enviado_por,
      new.junta_id, p_invite_id := new.id, p_source := 'database_trigger',
      p_metadata := jsonb_build_object('inviter_user_id', new.enviado_por)
    );
  end if;
  return new;
end;
$$;
drop trigger if exists analytics_invitation_event on public.invitations;
create trigger analytics_invitation_event after insert or update of estado on public.invitations
for each row execute function public.analytics_invitation_event_trigger();

create or replace function public.analytics_notification_event_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_sequence integer;
  v_cycle uuid;
begin
  if new.tipo = 'payment-reminder' then
    select count(*) into v_sequence from public.notifications n
      where n.junta_id = new.junta_id and n.profile_id = new.profile_id
        and n.tipo = 'payment-reminder' and n.created_at <= new.created_at;
    select ps.id into v_cycle from public.payment_schedules ps
      where ps.junta_id = new.junta_id
        and ps.cuota_numero = (select count(*)::integer + 1 from public.payouts
          where junta_id = new.junta_id)
      limit 1;
    perform public.record_product_event(
      'payment_reminder_sent', 'payment_reminder_sent:' || new.id,
      new.created_by, new.junta_id, p_cycle_id := v_cycle, p_notification_id := new.id,
      p_source := 'notification',
      p_metadata := jsonb_build_object(
        'recipient_user_id', new.profile_id, 'channel',
        case when new.email_status <> 'not_requested' then 'in_app_and_email' else 'in_app' end,
        'reminder_sequence', v_sequence
      ), p_occurred_at := new.created_at
    );
  end if;
  return new;
end;
$$;
drop trigger if exists analytics_notification_event on public.notifications;
create trigger analytics_notification_event after insert on public.notifications
for each row execute function public.analytics_notification_event_trigger();

-- The legacy trigger mislabeled a whole junta completion as cycle completion.
drop trigger if exists record_cycle_completed_activity_trigger on public.juntas;
