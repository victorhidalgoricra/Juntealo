-- Performance improvements for catalog queries.
--
-- A: index on juntas covering catalog WHERE + ORDER BY (enables bloqueada = false filter)
-- B: index on junta_members covering CTE group-by and user-membership lookup
-- C: catalog_juntas_public_light — use bloqueada = false (allows index use vs COALESCE)
-- D: catalog_juntas — replace correlated EXISTS with a single user_memberships CTE
--    Also adds bloqueada = false filter that was missing from the authenticated path.

create index if not exists juntas_catalog_visibility_bloqueada_idx
  on public.juntas (visibilidad, estado, bloqueada, created_at desc);

create index if not exists junta_members_estado_junta_profile_idx
  on public.junta_members (estado, junta_id, profile_id);

-- Public catalog: drop COALESCE so the new index is usable.
create or replace function public.catalog_juntas_public_light()
returns table (
  id uuid,
  admin_id uuid,
  nombre text,
  descripcion text,
  tipo_junta text,
  cuota_base numeric,
  monto_cuota numeric,
  frecuencia_pago public.frecuencia_pago,
  fecha_inicio date,
  estado public.junta_estado,
  participantes_max int,
  integrantes_actuales bigint,
  visibilidad public.junta_visibility,
  slug text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with members as (
    select
      jm.junta_id,
      count(distinct jm.profile_id)::bigint as distinct_members,
      bool_or(jm.profile_id = j.admin_id)   as has_creator_row
    from public.junta_members jm
    join public.juntas j on j.id = jm.junta_id
    where jm.estado = 'activo'
    group by jm.junta_id
  )
  select
    j.id,
    j.admin_id,
    j.nombre,
    j.descripcion,
    coalesce(j.tipo_junta, 'normal')             as tipo_junta,
    coalesce(j.cuota_base, j.monto_cuota)        as cuota_base,
    j.monto_cuota,
    j.frecuencia_pago,
    j.fecha_inicio,
    j.estado,
    j.participantes_max,
    coalesce(m.distinct_members, 0)
      + case when coalesce(m.has_creator_row, false) then 0 else 1 end as integrantes_actuales,
    j.visibilidad,
    j.slug,
    j.created_at
  from public.juntas j
  left join members m on m.junta_id = j.id
  where j.visibilidad = 'publica'
    and j.estado in ('borrador', 'activa')
    and j.bloqueada = false
  order by j.created_at desc
  limit 200;
$$;

revoke all on function public.catalog_juntas_public_light() from public;
grant execute on function public.catalog_juntas_public_light() to anon, authenticated;

-- Authenticated catalog: single user_memberships CTE replaces the per-row EXISTS.
-- Added bloqueada = false filter (was absent in previous version).
create or replace function public.catalog_juntas(p_include_private boolean default false)
returns table (
  id uuid,
  admin_id uuid,
  nombre text,
  descripcion text,
  visibilidad public.junta_visibility,
  tipo_junta text,
  cuota_base numeric,
  frecuencia_pago public.frecuencia_pago,
  fecha_inicio date,
  estado public.junta_estado,
  participantes_max int,
  access_code text,
  integrantes_actuales bigint,
  slug text,
  created_at timestamptz,
  is_member_current_user boolean
)
language sql
security definer
set search_path = public
as $$
  with user_memberships as (
    select junta_id
    from public.junta_members
    where profile_id = auth.uid()
      and estado = 'activo'
  ),
  members as (
    select
      jm.junta_id,
      count(distinct jm.profile_id)::bigint as distinct_members,
      bool_or(jm.profile_id = j.admin_id)   as has_creator_row
    from public.junta_members jm
    join public.juntas j on j.id = jm.junta_id
    where jm.estado = 'activo'
    group by jm.junta_id
  )
  select
    j.id,
    j.admin_id,
    j.nombre,
    j.descripcion,
    j.visibilidad,
    coalesce(j.tipo_junta, 'normal')             as tipo_junta,
    coalesce(j.cuota_base, j.monto_cuota)        as cuota_base,
    j.frecuencia_pago,
    j.fecha_inicio,
    j.estado,
    j.participantes_max,
    case when j.admin_id = auth.uid() then j.access_code else null end as access_code,
    coalesce(m.distinct_members, 0)
      + case when coalesce(m.has_creator_row, false) then 0 else 1 end as integrantes_actuales,
    j.slug,
    j.created_at,
    (j.admin_id = auth.uid() or um.junta_id is not null) as is_member_current_user
  from public.juntas j
  left join members m on m.junta_id = j.id
  left join user_memberships um on um.junta_id = j.id
  where j.estado in ('borrador', 'activa')
    and j.bloqueada = false
    and (j.visibilidad = 'publica' or (p_include_private = true and auth.uid() is not null))
  order by j.created_at desc
  limit 200;
$$;

revoke all on function public.catalog_juntas(boolean) from public;
grant execute on function public.catalog_juntas(boolean) to anon, authenticated;
