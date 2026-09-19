-- First-party, PII-free invite attribution. Existing invitations are reused as links;
-- one attribution row represents one anonymous browser opening one invite.

create or replace function public.normalize_attribution_dimension(p_value text)
returns text language plpgsql immutable set search_path=public as $$
declare v_value text;
begin
  v_value:=left(lower(regexp_replace(trim(p_value),'\s+','-','g')),100);
  if v_value~'^[a-z0-9][a-z0-9._-]{0,99}$' then return v_value; end if;
  return null;
end;
$$;
revoke all on function public.normalize_attribution_dimension(text) from public,anon,authenticated;

alter table public.user_activity_events drop constraint if exists user_activity_events_event_type_check;
alter table public.user_activity_events add constraint user_activity_events_event_type_check check (event_type in (
  'user_registered','junta_creation_started','junta_created',
  'junta_invite_created','junta_invite_link_opened','junta_invite_registered','junta_invite_accepted',
  'junta_join_requested','junta_joined','junta_member_removed','junta_member_left',
  'junta_first_member_joined','junta_filled','junta_activation_started','junta_activated',
  'cycle_started','cycle_completed','payment_started','payment_submitted',
  'payment_pending_validation','payment_confirmed','payment_rejected','payment_overdue',
  'payout_started','payout_completed','junta_completed','junta_cancelled',
  'explore_viewed','junta_viewed','create_junta_cta_clicked','join_junta_cta_clicked',
  'notification_created','notification_sent','notification_read','reminder_sent','payment_reminder_sent'
));

-- Legacy invitations required contact PII. Attribution links do not.
do $$
declare r record;
begin
  for r in select conname from pg_constraint
    where conrelid='public.invitations'::regclass and contype='c'
      and pg_get_constraintdef(oid) ilike '%email%'
      and pg_get_constraintdef(oid) ilike '%celular%'
  loop
    execute format('alter table public.invitations drop constraint %I',r.conname);
  end loop;
end;
$$;

alter table public.invitations
  add column if not exists channel text not null default 'link',
  add column if not exists source text not null default 'web';

update public.invitations set channel=case when email is not null then 'email' else 'mobile' end
where channel='link' and (email is not null or celular is not null);

create table if not exists public.junta_invite_attributions (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.invitations(id) on delete cascade,
  junta_id uuid not null references public.juntas(id) on delete cascade,
  anonymous_visitor_id uuid not null,
  is_first_touch boolean not null default false,
  first_opened_at timestamptz not null default now(),
  registered_user_id uuid references public.profiles(id) on delete set null,
  registered_at timestamptz,
  joined_at timestamptz,
  status text not null default 'opened' check (status in ('opened','registered','joined','expired')),
  acquisition_source text not null default 'invite'
    check (acquisition_source in ('direct','invite','organic_search','paid','referral','unknown')),
  acquisition_utm_source text,
  acquisition_medium text,
  acquisition_campaign text,
  created_at timestamptz not null default now(),
  unique(invite_id,anonymous_visitor_id),
  check (char_length(coalesce(acquisition_medium,'')) <= 100),
  check (char_length(coalesce(acquisition_utm_source,'')) <= 100),
  check (char_length(coalesce(acquisition_campaign,'')) <= 100)
);
create unique index if not exists idx_invite_attribution_first_anonymous
  on public.junta_invite_attributions(anonymous_visitor_id) where is_first_touch;
create unique index if not exists idx_invite_attribution_registered_user
  on public.junta_invite_attributions(registered_user_id) where registered_user_id is not null;
create index if not exists idx_invite_attribution_invite_status
  on public.junta_invite_attributions(invite_id,status,first_opened_at);
create index if not exists idx_invite_attribution_junta_registered
  on public.junta_invite_attributions(junta_id,registered_user_id)
  where registered_user_id is not null;

alter table public.junta_invite_attributions enable row level security;
revoke all on public.junta_invite_attributions from public,anon,authenticated;

alter table public.profiles
  add column if not exists acquisition_source text,
  add column if not exists acquisition_utm_source text,
  add column if not exists acquisition_medium text,
  add column if not exists acquisition_campaign text,
  add column if not exists acquisition_invite_id uuid references public.invitations(id) on delete set null;

alter table public.profiles drop constraint if exists profiles_acquisition_source_check;
alter table public.profiles add constraint profiles_acquisition_source_check check (
  acquisition_source is null or acquisition_source in
    ('direct','invite','organic_search','paid','referral','unknown')
);
alter table public.profiles drop constraint if exists profiles_acquisition_medium_length_check;
alter table public.profiles add constraint profiles_acquisition_medium_length_check
  check (char_length(coalesce(acquisition_medium,'')) <= 100);
alter table public.profiles drop constraint if exists profiles_acquisition_utm_source_length_check;
alter table public.profiles add constraint profiles_acquisition_utm_source_length_check
  check (char_length(coalesce(acquisition_utm_source,'')) <= 100);
alter table public.profiles drop constraint if exists profiles_acquisition_campaign_length_check;
alter table public.profiles add constraint profiles_acquisition_campaign_length_check
  check (char_length(coalesce(acquisition_campaign,'')) <= 100);

create or replace function public.ensure_default_junta_invite(p_junta_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_invite_id uuid;
begin
  begin
    insert into public.invitations(junta_id,enviado_por,token,expires_at,channel,source)
    select j.id,j.admin_id,j.invite_token,now()+interval '1 year','link','web'
    from public.juntas j where j.id=p_junta_id and j.invite_token is not null
    on conflict(token) do nothing returning id into v_invite_id;
    if v_invite_id is null then
      select id into v_invite_id from public.invitations i
      join public.juntas j on j.invite_token=i.token
      where j.id=p_junta_id limit 1;
    end if;
    return v_invite_id;
  exception when others then
    raise warning 'default invite creation failed for %: %',p_junta_id,sqlerrm;
    return null;
  end;
end;
$$;
revoke all on function public.ensure_default_junta_invite(uuid) from public,anon,authenticated;

create or replace function public.ensure_default_junta_invite_trigger()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.ensure_default_junta_invite(new.id);
  return new;
exception when others then
  return new;
end;
$$;
drop trigger if exists ensure_default_junta_invite on public.juntas;
create trigger ensure_default_junta_invite after insert on public.juntas
for each row execute function public.ensure_default_junta_invite_trigger();

-- Backfill link records from existing technical junta tokens; no PII is created.
select public.ensure_default_junta_invite(id) from public.juntas where invite_token is not null;

create or replace function public.open_junta_invite(
  p_token text,
  p_anonymous_visitor_id uuid,
  p_utm_source text default null,
  p_acquisition_medium text default null,
  p_acquisition_campaign text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_invite public.invitations%rowtype;
  v_attr public.junta_invite_attributions%rowtype;
  v_is_first boolean;
begin
  if p_anonymous_visitor_id is null then return jsonb_build_object('ok',false); end if;
  select i.* into v_invite from public.invitations i join public.juntas j on j.id=i.junta_id
  where i.token=p_token and i.expires_at>now() and j.deleted_at is null
    and j.estado::text not in ('eliminada','bloqueada') and not coalesce(j.bloqueada,false);
  if not found then return jsonb_build_object('ok',false); end if;

  perform pg_advisory_xact_lock(hashtextextended(p_anonymous_visitor_id::text,0));
  v_is_first := not exists(select 1 from public.junta_invite_attributions
    where anonymous_visitor_id=p_anonymous_visitor_id and is_first_touch);

  insert into public.junta_invite_attributions(
    invite_id,junta_id,anonymous_visitor_id,is_first_touch,
    acquisition_source,acquisition_utm_source,acquisition_medium,acquisition_campaign
  ) values (
    v_invite.id,v_invite.junta_id,p_anonymous_visitor_id,v_is_first,'invite',
    public.normalize_attribution_dimension(p_utm_source),
    public.normalize_attribution_dimension(p_acquisition_medium),
    public.normalize_attribution_dimension(p_acquisition_campaign)
  ) on conflict(invite_id,anonymous_visitor_id) do update
    set first_opened_at=least(junta_invite_attributions.first_opened_at,excluded.first_opened_at)
  returning * into v_attr;

  perform public.record_product_event(
    'junta_invite_link_opened',
    'junta_invite_link_opened:'||v_invite.id||':'||p_anonymous_visitor_id,
    null,v_invite.junta_id,p_invite_id:=v_invite.id,p_source:='web',
    p_metadata:=jsonb_build_object(
      'inviter_user_id',v_invite.enviado_por,
      'anonymous_visitor_id',p_anonymous_visitor_id,
      'is_first_touch',v_attr.is_first_touch,
      'channel',v_invite.channel
    ),p_occurred_at:=v_attr.first_opened_at
  );
  return jsonb_build_object(
    'ok',true,'attribution_id',v_attr.id,'invite_id',v_invite.id,
    'junta_id',v_invite.junta_id,'is_first_touch',v_attr.is_first_touch
  );
exception when others then
  return jsonb_build_object('ok',false);
end;
$$;
revoke all on function public.open_junta_invite(text,uuid,text,text,text) from public;
grant execute on function public.open_junta_invite(text,uuid,text,text,text) to anon,authenticated;

create or replace function public.bind_invite_registration(
  p_attribution_id uuid,p_anonymous_visitor_id uuid,p_user_id uuid
) returns boolean language plpgsql security definer set search_path=public as $$
declare v_attr public.junta_invite_attributions%rowtype; v_inviter uuid;
begin
  update public.junta_invite_attributions
  set registered_user_id=p_user_id,registered_at=coalesce(registered_at,now()),status='registered'
  where id=p_attribution_id and anonymous_visitor_id=p_anonymous_visitor_id
    and is_first_touch and registered_user_id is null
    and not exists(select 1 from public.junta_invite_attributions where registered_user_id=p_user_id)
  returning * into v_attr;
  if not found then return false; end if;
  select enviado_por into v_inviter from public.invitations where id=v_attr.invite_id;
  update public.profiles set acquisition_source='invite',
    acquisition_utm_source=v_attr.acquisition_utm_source,
    acquisition_medium=coalesce(v_attr.acquisition_medium,'shared_link'),
    acquisition_campaign=v_attr.acquisition_campaign,acquisition_invite_id=v_attr.invite_id
  where id=p_user_id and acquisition_invite_id is null;
  update public.user_activity_events set metadata=metadata||jsonb_build_object(
    'acquisition_source','invite','acquisition_medium',coalesce(v_attr.acquisition_medium,'shared_link'),
    'acquisition_utm_source',v_attr.acquisition_utm_source,
    'acquisition_campaign',v_attr.acquisition_campaign,'invite_id',v_attr.invite_id
  ) where event_key='user_registered:'||p_user_id;
  perform public.record_product_event(
    'junta_invite_registered','junta_invite_registered:'||v_attr.id,p_user_id,v_attr.junta_id,
    p_invite_id:=v_attr.invite_id,p_source:='database_trigger',p_metadata:=jsonb_build_object(
      'inviter_user_id',v_inviter,'registered_user_id',p_user_id,'attribution_id',v_attr.id
    ),p_occurred_at:=v_attr.registered_at
  );
  return true;
exception when unique_violation then return false;
when others then return false;
end;
$$;
revoke all on function public.bind_invite_registration(uuid,uuid,uuid) from public,anon,authenticated;

create or replace function public.claim_invite_attribution(
  p_attribution_id uuid,p_anonymous_visitor_id uuid
) returns boolean language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then return false; end if;
  return public.bind_invite_registration(p_attribution_id,p_anonymous_visitor_id,auth.uid());
end;
$$;
revoke all on function public.claim_invite_attribution(uuid,uuid) from public,anon;
grant execute on function public.claim_invite_attribution(uuid,uuid) to authenticated;

-- Profile creation is the authoritative registration boundary. Auth metadata contains
-- only normalized campaign fields and technical UUIDs.
create or replace function public.analytics_profile_event_trigger()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  v_meta jsonb;
  v_source text;
  v_utm_source text;
  v_medium text;
  v_campaign text;
  v_attr uuid;
  v_visitor uuid;
begin
  select raw_user_meta_data into v_meta from auth.users where id=new.id;
  v_source := case when v_meta->>'acquisition_source' in
    ('direct','invite','organic_search','paid','referral','unknown')
    then v_meta->>'acquisition_source' else 'unknown' end;
  v_medium := public.normalize_attribution_dimension(v_meta->>'acquisition_medium');
  v_utm_source := public.normalize_attribution_dimension(v_meta->>'acquisition_utm_source');
  v_campaign := public.normalize_attribution_dimension(v_meta->>'acquisition_campaign');
  begin v_attr := nullif(v_meta->>'invite_attribution_id','')::uuid; exception when others then v_attr:=null; end;
  begin v_visitor := nullif(v_meta->>'anonymous_visitor_id','')::uuid; exception when others then v_visitor:=null; end;

  update public.profiles set acquisition_source=v_source,
    acquisition_utm_source=v_utm_source,acquisition_medium=v_medium,acquisition_campaign=v_campaign
  where id=new.id and acquisition_source is null;
  perform public.record_product_event(
    'user_registered','user_registered:'||new.id,new.id,p_source:='database_trigger',
    p_metadata:=jsonb_build_object(
      'acquisition_source',v_source,'acquisition_utm_source',v_utm_source,'acquisition_medium',v_medium,
      'acquisition_campaign',v_campaign,'referral_code_present',false,
      'registration_channel','web'
    ),p_occurred_at:=new.created_at
  );
  if v_attr is not null and v_visitor is not null then
    perform public.bind_invite_registration(v_attr,v_visitor,new.id);
  end if;
  return new;
exception when others then
  return new;
end;
$$;

-- Referral attribution is first-touch: a valid invite is never overwritten.
create or replace function public.analytics_referral_event_trigger()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  update public.profiles set acquisition_source='referral'
  where id=new.referred_id and acquisition_invite_id is null
    and coalesce(acquisition_source,'unknown') in ('direct','unknown');
  update public.user_activity_events set metadata=metadata||jsonb_build_object(
    'acquisition_source','referral','referral_code_present',true
  ) where event_key='user_registered:'||new.referred_id
    and not (metadata ? 'invite_id');
  return new;
exception when others then return new;
end;
$$;

-- Invitation acceptance is per attributed person, not the shared invitation row.
create or replace function public.analytics_invitation_event_trigger()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op='INSERT' then
    perform public.record_product_event(
      'junta_invite_created','junta_invite_created:'||new.id,new.enviado_por,new.junta_id,
      p_invite_id:=new.id,p_source:='database_trigger',
      p_metadata:=jsonb_build_object('invitation_channel',coalesce(new.channel,'link')),
      p_occurred_at:=new.created_at
    );
  end if;
  return new;
exception when others then return new;
end;
$$;

update public.user_activity_events e
set metadata=jsonb_build_object('invitation_channel',i.channel)
from public.invitations i
where e.event_type='junta_invite_created' and e.invite_id=i.id;

create or replace function public.analytics_invite_join_trigger()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_attr public.junta_invite_attributions%rowtype; v_inviter uuid;
begin
  if new.estado::text not in ('activo','moroso') or
    (tg_op='UPDATE' and old.estado::text in ('activo','moroso')) then return new; end if;
  select * into v_attr from public.junta_invite_attributions
  where registered_user_id=new.profile_id and junta_id=new.junta_id and is_first_touch
  order by first_opened_at limit 1 for update;
  if not found then return new; end if;
  update public.junta_invite_attributions set joined_at=coalesce(joined_at,now()),status='joined'
    where id=v_attr.id returning * into v_attr;
  select enviado_por into v_inviter from public.invitations where id=v_attr.invite_id;
  perform public.record_product_event(
    'junta_joined','junta_joined:'||new.junta_id||':'||new.profile_id,
    new.profile_id,new.junta_id,p_source:='database_trigger',
    p_metadata:=jsonb_build_object('join_source','invitation'),p_occurred_at:=new.created_at
  );
  perform public.record_product_event(
    'junta_invite_accepted','junta_invite_accepted:'||v_attr.id,new.profile_id,new.junta_id,
    p_invite_id:=v_attr.invite_id,p_source:='database_trigger',p_metadata:=jsonb_build_object(
      'inviter_user_id',v_inviter,'registered_user_id',new.profile_id,'attribution_id',v_attr.id
    ),p_occurred_at:=v_attr.joined_at
  );
  return new;
exception when others then return new;
end;
$$;
drop trigger if exists analytics_invite_join on public.junta_members;
create trigger analytics_invite_join after insert or update of estado on public.junta_members
for each row execute function public.analytics_invite_join_trigger();

create or replace view public.product_analytics_invite_quality_issues
with (security_invoker=true) as
select 'invite_missing_created_event'::text issue_type,i.id invite_id,null::uuid attribution_id
from public.invitations i where not exists (
  select 1 from public.user_activity_events e
  where e.event_type='junta_invite_created' and e.invite_id=i.id)
union all
select 'open_missing_event',a.invite_id,a.id
from public.junta_invite_attributions a where not exists (
  select 1 from public.user_activity_events e
  where e.event_type='junta_invite_link_opened'
    and e.event_key='junta_invite_link_opened:'||a.invite_id||':'||a.anonymous_visitor_id)
union all
select 'registration_missing_event',a.invite_id,a.id
from public.junta_invite_attributions a
where a.registered_user_id is not null and not exists (
  select 1 from public.user_activity_events e
  where e.event_type='junta_invite_registered' and e.event_key='junta_invite_registered:'||a.id)
union all
select 'join_missing_event',a.invite_id,a.id
from public.junta_invite_attributions a
where a.joined_at is not null and not exists (
  select 1 from public.user_activity_events e
  where e.event_type='junta_invite_accepted' and e.event_key='junta_invite_accepted:'||a.id);
revoke all on public.product_analytics_invite_quality_issues from public,anon,authenticated;
grant select on public.product_analytics_invite_quality_issues to service_role;

create or replace function public.reconcile_invite_analytics()
returns jsonb language plpgsql security definer set search_path=public as $$
declare r record; v_inviter uuid; v_attempted integer:=0;
begin
  for r in select * from public.juntas where invite_token is not null loop
    perform public.ensure_default_junta_invite(r.id);
  end loop;
  for r in select i.* from public.invitations i loop
    perform public.record_product_event(
      'junta_invite_created','junta_invite_created:'||r.id,r.enviado_por,r.junta_id,
      p_invite_id:=r.id,p_source:='backend',
      p_metadata:=jsonb_build_object('invitation_channel',coalesce(r.channel,'link')),
      p_occurred_at:=r.created_at
    );
    v_attempted:=v_attempted+1;
  end loop;
  for r in select a.*,i.enviado_por,i.channel from public.junta_invite_attributions a
    join public.invitations i on i.id=a.invite_id
  loop
    perform public.record_product_event(
      'junta_invite_link_opened','junta_invite_link_opened:'||r.invite_id||':'||r.anonymous_visitor_id,
      null,r.junta_id,p_invite_id:=r.invite_id,p_source:='backend',p_metadata:=jsonb_build_object(
        'inviter_user_id',r.enviado_por,'anonymous_visitor_id',r.anonymous_visitor_id,
        'is_first_touch',r.is_first_touch,'channel',r.channel
      ),p_occurred_at:=r.first_opened_at
    );
    if r.registered_user_id is not null then
      perform public.record_product_event(
        'junta_invite_registered','junta_invite_registered:'||r.id,r.registered_user_id,r.junta_id,
        p_invite_id:=r.invite_id,p_source:='backend',p_metadata:=jsonb_build_object(
          'inviter_user_id',r.enviado_por,'registered_user_id',r.registered_user_id,
          'attribution_id',r.id
        ),p_occurred_at:=r.registered_at
      );
    end if;
    if r.joined_at is not null then
      perform public.record_product_event(
        'junta_invite_accepted','junta_invite_accepted:'||r.id,r.registered_user_id,r.junta_id,
        p_invite_id:=r.invite_id,p_source:='backend',p_metadata:=jsonb_build_object(
          'inviter_user_id',r.enviado_por,'registered_user_id',r.registered_user_id,
          'attribution_id',r.id
        ),p_occurred_at:=r.joined_at
      );
    end if;
    v_attempted:=v_attempted+1;
  end loop;
  return jsonb_build_object('attempted_repairs',v_attempted,'remaining_issues',
    (select count(*) from public.product_analytics_invite_quality_issues));
exception when others then
  return jsonb_build_object('error',sqlerrm,'attempted_repairs',v_attempted);
end;
$$;
revoke all on function public.reconcile_invite_analytics() from public,anon,authenticated;
grant execute on function public.reconcile_invite_analytics() to service_role;
