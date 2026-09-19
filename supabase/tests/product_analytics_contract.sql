begin;

-- Idempotency: the same deterministic key can produce at most one row.
do $$
declare v_key text := 'test_idempotency:'||gen_random_uuid(); v_count integer;
begin
  perform public.record_product_event('payment_confirmed',v_key,p_source:='backend',
    p_metadata:=jsonb_build_object('confirmed_amount',1,'is_on_time',true));
  perform public.record_product_event('payment_confirmed',v_key,p_source:='backend',
    p_metadata:=jsonb_build_object('confirmed_amount',1,'is_on_time',true));
  select count(*) into v_count from public.user_activity_events where event_key=v_key;
  if v_count<>1 then raise exception 'idempotency failed: expected 1, got %',v_count; end if;
end;
$$;

-- Financial resilience contract: even a hard failure on the event table is swallowed
-- by the analytics writer, so the simulated operational insert succeeds.
create or replace function pg_temp.reject_analytics_insert()
returns trigger language plpgsql as $$ begin raise exception 'simulated analytics outage'; end $$;
create trigger test_reject_analytics before insert on public.user_activity_events
for each row execute function pg_temp.reject_analytics_insert();
create temporary table test_financial_operation(id uuid primary key,state text not null);
create or replace function pg_temp.track_test_financial_operation()
returns trigger language plpgsql as $$
begin
  perform public.record_product_event('payment_confirmed','test_resilience:'||new.id,
    p_source:='backend',p_metadata:=jsonb_build_object('confirmed_amount',1,'is_on_time',true));
  return new;
end $$;
create trigger test_financial_tracking after insert on test_financial_operation
for each row execute function pg_temp.track_test_financial_operation();
insert into test_financial_operation values(gen_random_uuid(),'confirmed');
do $$ begin
  if (select count(*) from test_financial_operation where state='confirmed')<>1 then
    raise exception 'financial operation was blocked by analytics';
  end if;
end $$;
drop trigger test_reject_analytics on public.user_activity_events;

-- Duplicate opens and first-touch across different invites. Runs when invite fixtures exist.
do $$
declare v_first public.invitations%rowtype; v_second public.invitations%rowtype;
  v_visitor uuid:=gen_random_uuid(); v_count integer; v_first_count integer;
begin
  select * into v_first from public.invitations where expires_at>now() order by created_at limit 1;
  if v_first.id is null then raise notice 'invite attribution test skipped: no invite fixture'; return; end if;
  for v_count in 1..10 loop
    perform public.open_junta_invite(v_first.token,v_visitor,null,null,null);
  end loop;
  select count(*) into v_count from public.junta_invite_attributions
    where invite_id=v_first.id and anonymous_visitor_id=v_visitor;
  if v_count<>1 then raise exception 'duplicate open failed: expected 1 attribution, got %',v_count; end if;
  select * into v_second from public.invitations
    where id<>v_first.id and expires_at>now() order by created_at limit 1;
  if v_second.id is not null then
    perform public.open_junta_invite(v_second.token,v_visitor,null,null,null);
    select count(*) into v_first_count from public.junta_invite_attributions
      where anonymous_visitor_id=v_visitor and is_first_touch;
    if v_first_count<>1 then raise exception 'first-touch failed: expected 1, got %',v_first_count; end if;
  end if;
end;
$$;

rollback;
