-- Fix: get_member_payment_notifications excludes owned juntas and non-activo members.
--
-- Problem:
--   1. The RPC only looked at junta_members.estado='activo', missing juntas where the
--      user is admin but has no member record, or where the member estado differs.
--   2. A junta owner who is also a member with a different estado would not receive
--      payment alerts for their own junta.
--
-- Fix:
--   Step 1 now unions:
--     a) juntas where admin_id = p_profile_id (owner path)
--     b) juntas where junta_members.estado <> 'retirado' (member path)
--   Step 2 keeps the activa + non-blocked filter so only payment-relevant juntas
--   generate alert schedules/payments.

create or replace function public.get_member_payment_notifications(p_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_junta_ids        uuid[];
  v_active_junta_ids uuid[];
begin
  if auth.uid() is null or auth.uid() <> p_profile_id then
    raise exception 'No autorizado';
  end if;

  -- Step 1: all juntas where user is owner OR non-retirado member (no visibility filter)
  select coalesce(array_agg(distinct jid), '{}'::uuid[])
  into v_junta_ids
  from (
    select id as jid
    from public.juntas
    where admin_id = p_profile_id
      and estado <> 'eliminada'
    union
    select jm.junta_id as jid
    from public.junta_members jm
    where jm.profile_id = p_profile_id
      and jm.estado <> 'retirado'
  ) src;

  if array_length(v_junta_ids, 1) is null then
    return jsonb_build_object(
      'juntas',    '[]'::jsonb,
      'schedules', '[]'::jsonb,
      'payments',  '[]'::jsonb,
      'payouts',   '[]'::jsonb
    );
  end if;

  -- Step 2: only activa, non-blocked juntas generate payment notifications
  select coalesce(array_agg(j.id), '{}'::uuid[])
  into v_active_junta_ids
  from public.juntas j
  where j.id = any(v_junta_ids)
    and j.estado = 'activa'
    and not coalesce(j.bloqueada, false);

  if array_length(v_active_junta_ids, 1) is null then
    return jsonb_build_object(
      'juntas',    '[]'::jsonb,
      'schedules', '[]'::jsonb,
      'payments',  '[]'::jsonb,
      'payouts',   '[]'::jsonb
    );
  end if;

  return jsonb_build_object(
    'juntas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',                    j.id,
        'admin_id',              j.admin_id,
        'nombre',                j.nombre,
        'estado',                j.estado,
        'slug',                  j.slug,
        'invite_token',          j.invite_token,
        'access_code',           j.access_code,
        'bloqueada',             j.bloqueada,
        'tipo_junta',            coalesce(j.tipo_junta, 'normal'),
        'incentivo_porcentaje',  j.incentivo_porcentaje,
        'incentivo_regla',       j.incentivo_regla,
        'turn_assignment_mode',  j.turn_assignment_mode,
        'monto_cuota',           j.monto_cuota,
        'cuota_base',            j.monto_cuota,
        'bolsa_base',            j.bolsa_base,
        'moneda',                j.moneda,
        'participantes_max',     j.participantes_max,
        'premio_primero_pct',    j.premio_primero_pct,
        'descuento_ultimo_pct',  j.descuento_ultimo_pct,
        'fee_plataforma_pct',    j.fee_plataforma_pct,
        'frecuencia_pago',       j.frecuencia_pago,
        'fecha_inicio',          j.fecha_inicio,
        'dia_limite_pago',       j.dia_limite_pago,
        'penalidad_mora',        j.penalidad_mora,
        'visibilidad',           j.visibilidad,
        'cerrar_inscripciones',  j.cerrar_inscripciones,
        'created_at',            j.created_at
      ))
      from public.juntas j
      where j.id = any(v_active_junta_ids)
    ), '[]'::jsonb),

    'schedules', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',                ps.id,
        'junta_id',          ps.junta_id,
        'cuota_numero',      ps.cuota_numero,
        'fecha_vencimiento', ps.fecha_vencimiento,
        'monto',             ps.monto,
        'estado',            ps.estado
      ))
      from public.payment_schedules ps
      where ps.junta_id = any(v_active_junta_ids)
        and ps.estado in ('pendiente', 'vencida')
    ), '[]'::jsonb),

    'payments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',               p.id,
        'junta_id',         p.junta_id,
        'schedule_id',      p.schedule_id,
        'round_id',         p.round_id,
        'member_id',        p.member_id,
        'profile_id',       p.profile_id,
        'expected_amount',  p.expected_amount,
        'submitted_amount', p.submitted_amount,
        'monto',            p.monto,
        'estado',           p.estado,
        'receipt_url',      p.receipt_url,
        'comprobante_url',  p.comprobante_url,
        'payment_method',   p.payment_method,
        'operation_number', p.operation_number,
        'participant_note', p.participant_note,
        'payment_status',   p.payment_status,
        'submitted_at',     p.submitted_at,
        'internal_note',    p.internal_note,
        'validated_at',     p.validated_at,
        'validated_by',     p.validated_by,
        'rejection_reason', p.rejection_reason,
        'pagado_en',        p.pagado_en
      ))
      from public.payments p
      where p.profile_id = p_profile_id
        and p.junta_id = any(v_active_junta_ids)
    ), '[]'::jsonb),

    'payouts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',           po.id,
        'junta_id',     po.junta_id,
        'profile_id',   po.profile_id,
        'ronda_numero', po.ronda_numero,
        'monto_pozo',   po.monto_pozo,
        'entregado_en', po.entregado_en
      ))
      from public.payouts po
      where po.junta_id = any(v_active_junta_ids)
        and po.entregado_en is not null
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_member_payment_notifications(uuid) from public;
grant execute on function public.get_member_payment_notifications(uuid) to authenticated;
