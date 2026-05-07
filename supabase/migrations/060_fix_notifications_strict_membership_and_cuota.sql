-- Fix: payment alert shows overdue banner for juntas the user no longer belongs to.
--
-- Root causes identified:
--   1. Juntas filter was missing deleted_at IS NULL — soft-deleted juntas with
--      estado='activa' were included, returning their stale vencida schedules.
--   2. Juntas filter was missing bloqueada check, inconsistent with the frontend
--      guard that excludes bloqueada juntas from display.
--   3. Schedules query returned ALL pendiente/vencida schedules across ALL cuotas
--      for a junta, not just the CURRENT cuota. If the payout-based turn detection
--      on the frontend was off (e.g., entregado_en null for completed payouts),
--      historical vencida schedules from past turns triggered false overdue banners.
--
-- Fix: rewrite get_member_payment_notifications to:
--   a. Add deleted_at IS NULL + bloqueada checks to the juntas filter.
--   b. Filter payment_schedules to ONLY the current cuota_numero per junta,
--      derived entirely in SQL from the count of delivered payouts.
--      Current cuota = (SELECT COUNT(*) FROM payouts WHERE entregado_en IS NOT NULL) + 1
--      This eliminates all historical vencida schedules from past turns.
--   c. Keep the NOT EXISTS guard for approved payments (from migration 059).
--
-- Guarantee: if the user has NO active membership (junta_members.estado='activo')
-- in any active, non-deleted, non-blocked junta, the function returns empty arrays
-- and the dashboard shows no banner.

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
  -- Security: caller must query their own data only
  if auth.uid() is null or auth.uid() <> p_profile_id then
    raise exception 'No autorizado';
  end if;

  -- Step 1: active memberships (junta_members.estado = 'activo')
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

  -- Step 2: active juntas — not deleted, not blocked
  select coalesce(array_agg(j.id), '{}'::uuid[])
  into v_active_junta_ids
  from public.juntas j
  where j.id = any(v_junta_ids)
    and j.estado = 'activa'
    and j.deleted_at is null
    and (j.bloqueada is null or j.bloqueada = false);

  if array_length(v_active_junta_ids, 1) is null then
    return jsonb_build_object(
      'juntas',    '[]'::jsonb,
      'schedules', '[]'::jsonb,
      'payments',  '[]'::jsonb,
      'payouts',   '[]'::jsonb
    );
  end if;

  return jsonb_build_object(

    -- Active junta details for the frontend
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

    -- Only the schedule for the CURRENT cuota per junta.
    -- Current cuota = (delivered payouts for that junta) + 1.
    -- This prevents historical vencida schedules from past turns from appearing.
    -- Additionally excludes schedules already covered by an approved payment.
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
        -- Match only the current cuota_numero for this junta
        and ps.cuota_numero = (
          select count(*)::int + 1
          from public.payouts po
          where po.junta_id = ps.junta_id
            and po.entregado_en is not null
        )
        -- Exclude schedules already covered by an approved payment
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

    -- All payments for this user in active juntas (needed for en_validacion detection)
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

    -- Delivered payouts only (entregado_en IS NOT NULL) for frontend turn validation
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
