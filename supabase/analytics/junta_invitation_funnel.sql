-- Detail query. Replace one value in params and leave the other NULL.
with params as (
  select null::uuid as junta_id, null::text as junta_name
), selected_juntas as (
  select j.*
  from public.juntas j
  cross join params p
  where (p.junta_id is not null and j.id = p.junta_id)
     or (p.junta_id is null and p.junta_name is not null and j.nombre = p.junta_name)
), funnel as (
  select
    j.id as junta_id,
    j.nombre as junta_nombre,
    e.profile_id,
    e.event_type,
    coalesce(e.metadata ->> 'join_source', jm.join_source) as join_source,
    jm.rol,
    e.occurred_at,
    j.created_at as junta_created_at,
    p.created_at as profile_created_at
  from selected_juntas j
  join public.user_activity_events e on e.junta_id = j.id
  left join public.profiles p on p.id = e.profile_id
  left join public.junta_members jm
    on jm.junta_id = j.id and jm.profile_id = e.profile_id
)
select
  junta_nombre as nombre_junta,
  profile_id,
  event_type,
  join_source,
  rol,
  occurred_at as fecha_hora_evento,
  round(extract(epoch from (occurred_at - junta_created_at)) / 60.0, 2) as minutos_desde_creacion_junta,
  case when profile_created_at is not null
    then round(extract(epoch from (occurred_at - profile_created_at)) / 60.0, 2)
  end as minutos_desde_registro_usuario,
  row_number() over (partition by junta_id order by occurred_at, event_type) as orden_cronologico
from funnel
order by junta_id, occurred_at, event_type;

-- Summary query. Uses open_id as an anonymous actor only for invite_opened.
-- Replace one value in params and leave the other NULL.
with params as (
  select null::uuid as junta_id, null::text as junta_name
), stages(stage, stage_order) as (values
  ('junta_created', 1),
  ('invite_link_copied', 2),
  ('access_code_copied', 3),
  ('whatsapp_share_clicked', 4),
  ('invite_opened', 5),
  ('signup_completed', 6),
  ('joined_junta', 7),
  ('junta_full', 8)
), selected_events as (
  select e.*
  from public.user_activity_events e
  join public.juntas j on j.id = e.junta_id
  cross join params p
  where (p.junta_id is not null and j.id = p.junta_id)
     or (p.junta_id is null and p.junta_name is not null and j.nombre = p.junta_name)
)
select
  s.stage as event_type,
  count(e.id) as cantidad_eventos,
  count(distinct coalesce(e.profile_id::text, e.metadata ->> 'open_id')) as usuarios_unicos
from stages s
left join selected_events e on e.event_type = s.stage
group by s.stage, s.stage_order
order by s.stage_order;
