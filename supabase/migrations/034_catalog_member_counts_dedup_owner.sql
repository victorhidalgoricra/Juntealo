-- Ensure catalog member counts treat creator as member exactly once.
-- Also expose admin_id in the lightweight public catalog used by UI role logic.

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
      bool_or(jm.profile_id = j.admin_id) as has_creator_row
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
    coalesce(j.tipo_junta, 'normal') as tipo_junta,
    coalesce(j.cuota_base, j.monto_cuota) as cuota_base,
    j.monto_cuota,
    j.frecuencia_pago,
    j.fecha_inicio,
    j.estado,
    j.participantes_max,
    coalesce(m.distinct_members, 0) + case when coalesce(m.has_creator_row, false) then 0 else 1 end as integrantes_actuales,
    j.visibilidad,
    j.slug,
    j.created_at
  from public.juntas j
  left join members m on m.junta_id = j.id
  where j.visibilidad = 'publica'
    and j.estado in ('borrador', 'activa')
    and coalesce(j.bloqueada, false) = false
  order by j.created_at desc
  limit 200;
$$;

revoke all on function public.catalog_juntas_public_light() from public;
grant execute on function public.catalog_juntas_public_light() to anon, authenticated;

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
  with members as (
    select
      jm.junta_id,
      count(distinct jm.profile_id)::bigint as distinct_members,
      bool_or(jm.profile_id = j.admin_id) as has_creator_row
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
    coalesce(j.tipo_junta, 'normal') as tipo_junta,
    coalesce(j.cuota_base, j.monto_cuota) as cuota_base,
    j.frecuencia_pago,
    j.fecha_inicio,
    j.estado,
    j.participantes_max,
    case when j.admin_id = auth.uid() then j.access_code else null end as access_code,
    coalesce(m.distinct_members, 0) + case when coalesce(m.has_creator_row, false) then 0 else 1 end as integrantes_actuales,
    j.slug,
    j.created_at,
    (
      j.admin_id = auth.uid()
      or exists (
        select 1
        from public.junta_members jm
        where jm.junta_id = j.id
          and jm.profile_id = auth.uid()
          and jm.estado = 'activo'
      )
    ) as is_member_current_user
  from public.juntas j
  left join members m on m.junta_id = j.id
  where j.estado in ('borrador', 'activa')
    and (j.visibilidad = 'publica' or (p_include_private = true and auth.uid() is not null))
  order by j.created_at desc
  limit 200;
$$;

revoke all on function public.catalog_juntas(boolean) from public;
grant execute on function public.catalog_juntas(boolean) to anon, authenticated;
