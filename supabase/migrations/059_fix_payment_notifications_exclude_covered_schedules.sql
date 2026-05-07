-- Fix: overdue banner appears even when user has approved/submitted payments.
--
-- Root cause 1: payment_schedules.estado can remain 'vencida' after a payment is
-- approved (the schedule's estado is not always updated to 'pagada' atomically).
-- The frontend matched payments by schedule_id and filtered approved ones correctly,
-- but only when schedule_id was set. If schedule_id was null or mislinked, no
-- payment was found and the schedule was wrongly classified as overdue.
--
-- Root cause 2: schedules query returned ALL pendiente/vencida schedules for the
-- junta without checking if the requesting user already has a valid payment for each.
--
-- Fix: add NOT EXISTS to exclude schedules where the user already has an approved
-- payment (estado='aprobado' or payment_status='approved').
-- Schedules with submitted (pendiente_aprobacion) payments are NOT excluded so the
-- frontend can continue to show the en_validacion (blue) banner for those.
--
-- Source of truth:
--   overdue = schedule.estado IN ('pendiente','vencida')
--     AND no payment with approved status for that (schedule_id, profile_id).
--   en_validacion = schedule.estado IN ('pendiente','vencida')
--     AND payment with submitted/pendiente_aprobacion status exists.
--   none = all schedules have approved payments (not returned by this query).

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
  -- Security: caller must be querying their own data
  if auth.uid() is null or auth.uid() <> p_profile_id then
    raise exception 'No autorizado';
  end if;

  -- Step 1: active memberships
  select coalesce(array_agg(jm.junta_id), '{}'::uuid[])
  into v_junta_ids
  from public.junta_members jm
  where jm.profile_id = p_profile_id
    and jm.estado = 'activo';

  if array_length(v_junta_ids, 1) is null then
    return jsonb_build_object(
      'juntas',    '[]'::jsonb,
      'schedules', '[]'::jsonb,
      'payments',  '[]'::jsonb,
      'payouts',   '[]'::jsonb
    );
  end if;

  -- Step 2: active juntas from those memberships
  select coalesce(array_agg(j.id), '{}'::uuid[])
  into v_active_junta_ids
  from public.juntas j
  where j.id = any(v_junta_ids)
    and j.estado = 'activa';

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

    -- Only return schedules that still need attention from this user:
    --   - No approved payment exists for this schedule + profile combination.
    --   - Schedules with submitted (pendiente_aprobacion) payments are kept so
    --     the frontend can show the en_validacion banner.
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
        and not exists (
          select 1 from public.payments pay
          where pay.schedule_id = ps.id
            and pay.profile_id = p_profile_id
            and (
              pay.estado        in ('aprobado')
              or pay.payment_status in ('approved')
            )
        )
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

    -- Only delivered payouts (entregado_en IS NOT NULL) for turn detection.
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
