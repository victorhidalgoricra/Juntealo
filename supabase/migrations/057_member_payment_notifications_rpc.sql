-- Fix: payment notifications not appearing for regular members.
--
-- Root cause: is_junta_member() used in payment_schedules and payments RLS policies
-- may not evaluate auth.uid() correctly when called from a policy context for a
-- non-owner member, causing empty results even when the member has active memberships.
--
-- Fix: SECURITY DEFINER function that bypasses all RLS and executes the exact
-- query chain specified by the notification spec:
--   1. junta_members (profile_id = p_profile_id AND estado = 'activo')
--   2. juntas (estado = 'activa')
--   3. payment_schedules (estado IN pendiente|vencida)
--   4. payments (profile_id = p_profile_id) — LEFT JOIN to capture missing payments
--
-- Additionally, drop and recreate the SELECT policies on payment_schedules and
-- payments using uid_is_active_member_of() (already SECURITY DEFINER from migration 036)
-- as the primary check, removing any dependency on is_junta_member() for these tables.

-- ─── 1. Harden RLS on payment_schedules ─────────────────────────────────────
drop policy if exists "schedule visible by members" on public.payment_schedules;

create policy "schedule_select_active_member" on public.payment_schedules
  for select
  using (
    -- owner always sees schedules
    exists (
      select 1 from public.juntas j
      where j.id = payment_schedules.junta_id
        and j.admin_id = auth.uid()
    )
    -- any active member can see schedules for their junta
    or public.uid_is_active_member_of(payment_schedules.junta_id)
  );

-- ─── 2. Harden RLS on payments ───────────────────────────────────────────────
drop policy if exists "payments visible by members" on public.payments;

create policy "payments_select_own_or_active_member" on public.payments
  for select
  using (
    -- always see your own payments
    profile_id = auth.uid()
    -- owner sees all payments for their junta
    or exists (
      select 1 from public.juntas j
      where j.id = payments.junta_id
        and j.admin_id = auth.uid()
    )
    -- any active member can see all payments for their junta
    or public.uid_is_active_member_of(payments.junta_id)
  );

-- ─── 3. SECURITY DEFINER RPC — definitive fix ────────────────────────────────
-- Returns { juntas, schedules, payments } as JSONB.
-- Bypasses ALL RLS — uses auth.uid() only as a security guard.

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
      'payments',  '[]'::jsonb
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
      'payments',  '[]'::jsonb
    );
  end if;

  -- Steps 3-5: build result
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
        'id',               ps.id,
        'junta_id',         ps.junta_id,
        'cuota_numero',     ps.cuota_numero,
        'fecha_vencimiento', ps.fecha_vencimiento,
        'monto',            ps.monto,
        'estado',           ps.estado
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
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_member_payment_notifications(uuid) from public;
grant execute on function public.get_member_payment_notifications(uuid) to authenticated;
