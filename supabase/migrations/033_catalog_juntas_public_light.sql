-- Fast public catalog query with minimal fields for Explore cards.
-- Avoids membership subqueries/counts per row to prevent statement timeouts.

create or replace function public.catalog_juntas_public_light()
returns table (
  id uuid,
  nombre text,
  descripcion text,
  tipo_junta text,
  cuota_base numeric,
  monto_cuota numeric,
  frecuencia_pago public.frecuencia_pago,
  fecha_inicio date,
  estado public.junta_estado,
  participantes_max int,
  visibilidad public.junta_visibility,
  slug text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    j.id,
    j.nombre,
    j.descripcion,
    coalesce(j.tipo_junta, 'normal') as tipo_junta,
    coalesce(j.cuota_base, j.monto_cuota) as cuota_base,
    j.monto_cuota,
    j.frecuencia_pago,
    j.fecha_inicio,
    j.estado,
    j.participantes_max,
    j.visibilidad,
    j.slug,
    j.created_at
  from public.juntas j
  where j.visibilidad = 'publica'
    and j.estado = 'activa'
    and coalesce(j.bloqueada, false) = false
    and coalesce(j.cerrar_inscripciones, false) = false
  order by j.created_at desc
  limit 200;
$$;

revoke all on function public.catalog_juntas_public_light() from public;
grant execute on function public.catalog_juntas_public_light() to anon, authenticated;
