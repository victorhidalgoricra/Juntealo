-- Juntealo product analytics export queries.
-- READ ONLY: this file intentionally contains only SELECT statements.
-- In Supabase SQL Editor, highlight and run one numbered block at a time,
-- then export that result as the corresponding CSV filename.
-- Do not apply this file through `supabase db push`: migration runners discard
-- SELECT result sets. The migrations folder is used here only as requested so
-- the audited queries stay versioned beside the schema they describe.

-- ============================================================================
-- 01_users.csv
-- ============================================================================
WITH user_metrics AS (
  SELECT p.id AS user_id, p.created_at, r.referrer_id AS referred_by,
    public.current_junta_score(p.id) AS base_score,
    LEAST((SELECT count(*) FROM public.referrals x
      WHERE x.referrer_id = p.id AND x.status = 'active'), 4) AS active_referrals,
    (SELECT count(*) FROM public.payment_schedules ps
      JOIN public.payments pay ON pay.schedule_id = ps.id
       AND pay.junta_id = ps.junta_id AND pay.profile_id = p.id
      WHERE (pay.payment_status = 'approved' OR pay.estado::text = 'aprobado')
        AND coalesce(pay.submitted_at, pay.pagado_en, pay.validated_at)
          < ps.fecha_vencimiento::timestamptz + interval '1 day') AS on_time_payments,
    (SELECT count(*) FROM public.juntas j
      WHERE j.estado::text = 'cerrada' AND (j.admin_id = p.id OR EXISTS (
        SELECT 1 FROM public.junta_members jm WHERE jm.junta_id = j.id
          AND jm.profile_id = p.id AND jm.estado::text IN ('activo','moroso')))
    ) AS completed_cycles,
    (SELECT max(e.occurred_at) FROM public.user_activity_events e
      WHERE e.profile_id = p.id) AS last_activity_at
  FROM public.profiles p
  LEFT JOIN public.referrals r ON r.referred_id = p.id
), scored AS (
  SELECT *, greatest(0, least(100,
    round(base_score + active_referrals::numeric / 7 * 10)))::int AS score
  FROM user_metrics
), ranked AS (
  SELECT *, row_number() OVER
    (ORDER BY score DESC, completed_cycles DESC, created_at, user_id) AS ranking
  FROM scored
)
SELECT user_id, created_at, created_at::date AS registration_date,
  NULL::text AS user_status,
  CASE WHEN referred_by IS NOT NULL THEN 'referral' ELSE 'unknown' END AS registration_source,
  referred_by, score,
  CASE WHEN score >= 85 THEN 'Elite' WHEN score >= 70 THEN 'Oro'
    WHEN score >= 50 THEN 'Plata' WHEN score >= 30 THEN 'Bronce' ELSE 'Nuevo' END AS level,
  on_time_payments, completed_cycles, ranking, last_activity_at,
  CASE WHEN last_activity_at >= now() - interval '30 days' THEN 'active_30d'
    WHEN last_activity_at >= now() - interval '90 days' THEN 'inactive_31_90d'
    WHEN last_activity_at IS NOT NULL THEN 'inactive_90d_plus'
    ELSE 'no_tracked_activity' END AS activity_recency_segment
FROM ranked ORDER BY created_at;

-- ============================================================================
-- 02_user_activity_events.csv
-- ============================================================================
SELECT id AS event_id, profile_id AS user_id, event_type AS event_name,
  occurred_at AS event_timestamp, junta_id, payment_id,
  metadata - 'junta_name' AS metadata
FROM public.user_activity_events
ORDER BY occurred_at, id;

-- ============================================================================
-- 03_juntas.csv
-- ============================================================================
WITH members AS (
  SELECT j.id AS junta_id,
    count(*) FILTER (WHERE jm.estado::text <> 'retirado') AS total_participants,
    min(jm.created_at) FILTER (WHERE jm.profile_id <> j.admin_id) AS first_member_at,
    max(jm.created_at) FILTER (WHERE jm.estado::text <> 'retirado') AS roster_filled_at
  FROM public.juntas j LEFT JOIN public.junta_members jm ON jm.junta_id = j.id
  GROUP BY j.id
), schedules AS (
  SELECT junta_id, min(created_at) AS activation_at_estimated,
    count(*) AS number_of_cycles FROM public.payment_schedules GROUP BY junta_id
), payout_stats AS (
  SELECT junta_id, count(*) AS completed_cycles, max(entregado_en) AS last_payout_at
  FROM public.payouts GROUP BY junta_id
)
SELECT j.id AS junta_id, j.admin_id AS creator_id, j.created_at, j.updated_at,
  j.visibilidad::text AS visibility, j.estado::text AS status, j.tipo_junta,
  j.moneda AS currency, j.monto_cuota AS contribution_amount,
  j.cuota_base AS base_contribution_amount, j.bolsa_base AS configured_pool_amount,
  j.frecuencia_pago::text AS frequency, j.participantes_max AS maximum_participants,
  coalesce(m.total_participants,0) AS total_participants,
  greatest(j.participantes_max - coalesce(m.total_participants,0),0) AS available_slots,
  round(coalesce(m.total_participants,0)::numeric / nullif(j.participantes_max,0),4) AS fill_rate,
  coalesce(m.total_participants,0) >= j.participantes_max AS is_full,
  j.fecha_inicio AS scheduled_start_date, s.activation_at_estimated,
  CASE WHEN j.estado::text = 'cerrada' THEN po.last_payout_at END AS completed_at_estimated,
  CASE WHEN j.estado::text = 'eliminada' THEN j.deleted_at END AS cancelled_at,
  least(coalesce(po.completed_cycles,0) + 1, j.participantes_max) AS current_cycle,
  coalesce(s.number_of_cycles,j.participantes_max) AS number_of_cycles,
  j.dia_limite_pago AS payment_deadline_day, j.cerrar_inscripciones AS registrations_closed,
  j.bloqueada AS is_blocked, j.deleted_at, j.turn_assignment_mode,
  j.incentivo_porcentaje AS incentive_percentage, j.incentivo_regla AS incentive_rule,
  j.premio_primero_pct AS first_turn_reward_percentage,
  j.descuento_ultimo_pct AS last_turn_discount_percentage,
  j.fee_plataforma_pct AS platform_fee_percentage, j.penalidad_mora AS late_fee,
  m.first_member_at,
  CASE WHEN m.first_member_at IS NOT NULL THEN m.first_member_at - j.created_at END AS time_to_first_member,
  CASE WHEN coalesce(m.total_participants,0) >= j.participantes_max
    THEN m.roster_filled_at - j.created_at END AS time_to_fill_estimated,
  CASE WHEN s.activation_at_estimated IS NOT NULL
    THEN s.activation_at_estimated - j.created_at END AS time_to_activation_estimated
FROM public.juntas j LEFT JOIN members m ON m.junta_id = j.id
LEFT JOIN schedules s ON s.junta_id = j.id LEFT JOIN payout_stats po ON po.junta_id = j.id
ORDER BY j.created_at;

-- ============================================================================
-- 04_junta_members.csv
-- ============================================================================
SELECT jm.id AS membership_id, jm.junta_id, jm.profile_id AS user_id,
  jm.profile_id = j.admin_id AS is_creator, jm.rol AS member_role,
  jm.created_at AS joined_at, NULL::timestamptz AS invited_at,
  NULL::timestamptz AS accepted_at, jm.estado::text AS member_status,
  jm.orden_turno AS turn_number, jm.orden_turno AS position,
  j.monto_cuota AS expected_contribution_per_cycle, jm.saldo_pendiente AS pending_balance,
  jm.left_at, jm.racha_semanas AS current_streak_weeks, jm.racha_record AS record_streak_weeks
FROM public.junta_members jm JOIN public.juntas j ON j.id = jm.junta_id
ORDER BY jm.junta_id, jm.orden_turno, jm.created_at;

-- ============================================================================
-- 05_payments.csv
-- ============================================================================
WITH obligations AS (
  SELECT ps.id AS schedule_id, ps.junta_id, ps.cuota_numero AS cycle_number,
    ps.fecha_vencimiento AS due_date, ps.monto AS scheduled_amount,
    payer.id AS member_id, payer.profile_id AS payer_id, receiver.profile_id AS receiver_id
  FROM public.payment_schedules ps
  JOIN public.junta_members payer ON payer.junta_id = ps.junta_id
   AND payer.orden_turno <> ps.cuota_numero
   AND payer.created_at < ps.fecha_vencimiento::timestamptz + interval '1 day'
   AND (payer.left_at IS NULL OR payer.left_at >= ps.fecha_vencimiento::timestamptz)
  LEFT JOIN public.junta_members receiver ON receiver.junta_id = ps.junta_id
   AND receiver.orden_turno = ps.cuota_numero AND receiver.estado::text <> 'retirado'
), latest_payment AS (
  SELECT DISTINCT ON (p.junta_id,p.schedule_id,p.profile_id) p.*
  FROM public.payments p
  ORDER BY p.junta_id,p.schedule_id,p.profile_id,
    coalesce(p.submitted_at,p.pagado_en,p.created_at) DESC,p.created_at DESC
)
SELECT lp.id AS payment_id, o.schedule_id, o.junta_id, o.payer_id AS user_id,
  o.payer_id, o.receiver_id, o.cycle_number,
  coalesce(lp.expected_amount,o.scheduled_amount) AS expected_amount,
  coalesce(lp.submitted_amount,lp.monto) AS actual_amount, o.due_date,
  coalesce(lp.submitted_at,lp.pagado_en) AS payment_date, lp.created_at,
  coalesce(lp.payment_status,lp.estado::text,
    CASE WHEN o.due_date < current_date THEN 'unpaid_overdue' ELSE 'unpaid_pending' END) AS payment_status,
  lp.estado::text AS validation_status,
  CASE WHEN lp.payment_status = 'approved' OR lp.estado::text = 'aprobado'
    THEN lp.validated_at END AS confirmed_at,
  CASE WHEN lp.payment_status = 'rejected' OR lp.estado::text = 'rechazado'
    THEN lp.validated_at END AS rejected_at,
  lp.payment_method AS payment_method_category, lp.validated_by,
  coalesce(lp.payment_status = 'approved' OR lp.estado::text = 'aprobado',false) AS is_paid,
  coalesce(lp.payment_status = 'approved' OR lp.estado::text = 'aprobado',false) AS is_confirmed,
  CASE WHEN lp.id IS NULL THEN false ELSE coalesce(lp.submitted_at,lp.pagado_en)
    < o.due_date::timestamptz + interval '1 day' END AS is_on_time,
  CASE WHEN lp.id IS NULL AND o.due_date < current_date THEN current_date - o.due_date
    WHEN coalesce(lp.submitted_at,lp.pagado_en) >= o.due_date::timestamptz + interval '1 day'
    THEN round(extract(epoch FROM (coalesce(lp.submitted_at,lp.pagado_en)
      - (o.due_date::timestamptz + interval '1 day'))) / 86400.0,4) ELSE 0 END AS days_late,
  CASE WHEN lp.id IS NULL AND o.due_date < current_date THEN extract(epoch FROM
      (now() - (o.due_date::timestamptz + interval '1 day'))) / 3600.0
    WHEN coalesce(lp.submitted_at,lp.pagado_en) >= o.due_date::timestamptz + interval '1 day'
    THEN round(extract(epoch FROM (coalesce(lp.submitted_at,lp.pagado_en)
      - (o.due_date::timestamptz + interval '1 day'))) / 3600.0,2) ELSE 0 END AS hours_late
FROM obligations o LEFT JOIN latest_payment lp ON lp.junta_id = o.junta_id
 AND lp.schedule_id = o.schedule_id AND lp.profile_id = o.payer_id
ORDER BY o.due_date,o.junta_id,o.cycle_number,o.payer_id;

-- ============================================================================
-- 06_cycles_payouts.csv
-- ============================================================================
SELECT ps.junta_id, ps.id AS cycle_id, ps.cuota_numero AS cycle_number,
  receiver.profile_id AS receiver_user_id,
  ps.monto * greatest(j.participantes_max - 1,0) AS expected_amount,
  po.monto_pozo AS received_amount, ps.fecha_vencimiento AS expected_date,
  po.entregado_en AS received_date,
  CASE WHEN po.id IS NOT NULL THEN 'completed'
    WHEN ps.estado::text = 'vencida' OR ps.fecha_vencimiento < current_date THEN 'overdue'
    ELSE ps.estado::text END AS status,
  po.entregado_en AS completed_at, po.id AS payout_id, ps.estado::text AS schedule_status
FROM public.payment_schedules ps JOIN public.juntas j ON j.id = ps.junta_id
LEFT JOIN public.junta_members receiver ON receiver.junta_id = ps.junta_id
 AND receiver.orden_turno = ps.cuota_numero AND receiver.estado::text <> 'retirado'
LEFT JOIN public.payouts po ON po.junta_id = ps.junta_id
 AND po.ronda_numero = ps.cuota_numero
ORDER BY ps.junta_id,ps.cuota_numero;

-- ============================================================================
-- 07_invites_referrals.csv
-- ============================================================================
SELECT 'junta_invitation'::text AS record_type, i.enviado_por AS inviter_user_id,
  NULL::uuid AS invited_user_id, i.junta_id, i.id AS invite_id, i.created_at,
  NULL::timestamptz AS clicked_at, NULL::timestamptz AS accepted_at,
  NULL::timestamptz AS registered_at, NULL::timestamptz AS joined_at,
  i.estado::text AS status
FROM public.invitations i
UNION ALL
SELECT 'user_referral',r.referrer_id,r.referred_id,NULL::uuid,r.id,r.created_at,
  NULL::timestamptz,NULL::timestamptz,p.created_at,NULL::timestamptz,r.status
FROM public.referrals r JOIN public.profiles p ON p.id = r.referred_id
ORDER BY created_at,invite_id;

-- ============================================================================
-- 08_notifications.csv
-- ============================================================================
SELECT id AS notification_id, profile_id AS user_id, junta_id,
  tipo AS notification_type,
  CASE WHEN email_status <> 'not_requested' THEN 'in_app_and_email' ELSE 'in_app' END AS channel,
  created_at, email_sent_at AS sent_at, NULL::timestamptz AS delivered_at,
  NULL::timestamptz AS read_at, leida AS is_read,
  CASE WHEN email_status <> 'not_requested' THEN email_status
    WHEN leida THEN 'read' ELSE 'created' END AS status,
  created_by AS triggered_by_user_id
FROM public.notifications ORDER BY created_at,id;

-- ============================================================================
-- 09_activation_funnel.csv
-- ============================================================================
WITH junta_facts AS (
  SELECT j.id,j.admin_id,j.created_at,
    min(jm.created_at) FILTER (WHERE jm.profile_id <> j.admin_id) AS first_member_at,
    CASE WHEN count(*) FILTER (WHERE jm.estado::text <> 'retirado') >= j.participantes_max
      THEN max(jm.created_at) FILTER (WHERE jm.estado::text <> 'retirado') END AS full_at_estimated,
    min(ps.created_at) AS activated_at_estimated,
    min(p.validated_at) FILTER (WHERE p.payment_status = 'approved'
      OR p.estado::text = 'aprobado') AS first_payment_at,
    min(po.entregado_en) AS first_cycle_completed_at,
    CASE WHEN j.estado::text = 'cerrada' THEN max(po.entregado_en) END AS finalized_at_estimated
  FROM public.juntas j LEFT JOIN public.junta_members jm ON jm.junta_id = j.id
  LEFT JOIN public.payment_schedules ps ON ps.junta_id = j.id
  LEFT JOIN public.payments p ON p.junta_id = j.id LEFT JOIN public.payouts po ON po.junta_id = j.id
  GROUP BY j.id
), events AS (
  SELECT 'registered' AS event_name, p.created_at AS occurred_at,
    p.id AS user_id, NULL::uuid AS junta_id FROM public.profiles p
  UNION ALL SELECT 'created_junta',created_at,admin_id,id FROM junta_facts
  UNION ALL SELECT 'joined_junta',jm.created_at,jm.profile_id,jm.junta_id
    FROM public.junta_members jm JOIN public.juntas j ON j.id = jm.junta_id WHERE jm.profile_id <> j.admin_id
  UNION ALL SELECT 'first_member',first_member_at,NULL,id FROM junta_facts WHERE first_member_at IS NOT NULL
  UNION ALL SELECT 'full',full_at_estimated,NULL,id FROM junta_facts WHERE full_at_estimated IS NOT NULL
  UNION ALL SELECT 'activated',activated_at_estimated,NULL,id FROM junta_facts WHERE activated_at_estimated IS NOT NULL
  UNION ALL SELECT 'first_payment',first_payment_at,NULL,id FROM junta_facts WHERE first_payment_at IS NOT NULL
  UNION ALL SELECT 'first_cycle_completed',first_cycle_completed_at,NULL,id FROM junta_facts WHERE first_cycle_completed_at IS NOT NULL
  UNION ALL SELECT 'finalized',finalized_at_estimated,NULL,id FROM junta_facts WHERE finalized_at_estimated IS NOT NULL
), periodized AS (
  SELECT grain, date_trunc(grain, occurred_at)::date AS period_start,
    event_name, user_id, junta_id
  FROM events CROSS JOIN (VALUES ('week'::text),('month'::text)) g(grain)
), summary AS (
  SELECT grain,period_start,
    count(DISTINCT user_id) FILTER (WHERE event_name='registered') AS registered_users,
    count(DISTINCT user_id) FILTER (WHERE event_name='created_junta') AS users_who_created_junta,
    count(DISTINCT user_id) FILTER (WHERE event_name='joined_junta') AS users_who_joined_junta,
    count(DISTINCT junta_id) FILTER (WHERE event_name='created_junta') AS juntas_created,
    count(DISTINCT junta_id) FILTER (WHERE event_name='first_member') AS juntas_with_first_member,
    count(DISTINCT junta_id) FILTER (WHERE event_name='full') AS juntas_full,
    count(DISTINCT junta_id) FILTER (WHERE event_name='activated') AS juntas_activated,
    count(DISTINCT junta_id) FILTER (WHERE event_name='first_payment') AS juntas_with_first_confirmed_payment,
    count(DISTINCT junta_id) FILTER (WHERE event_name='first_cycle_completed') AS juntas_with_completed_cycle,
    count(DISTINCT junta_id) FILTER (WHERE event_name='finalized') AS juntas_finalized
  FROM periodized GROUP BY grain,period_start
)
SELECT *, round(100.0*users_who_joined_junta/nullif(registered_users,0),2) AS registration_to_participation_rate,
  round(100.0*juntas_with_first_member/nullif(juntas_created,0),2) AS created_to_first_member_rate,
  round(100.0*juntas_full/nullif(juntas_created,0),2) AS junta_fill_rate,
  round(100.0*juntas_activated/nullif(juntas_created,0),2) AS junta_activation_rate,
  round(100.0*juntas_with_first_confirmed_payment/nullif(juntas_activated,0),2) AS activation_to_first_payment_rate,
  round(100.0*juntas_finalized/nullif(juntas_created,0),2) AS completed_junta_rate
FROM summary ORDER BY grain,period_start;

-- ============================================================================
-- 10_retention_cohorts.csv
-- ============================================================================
WITH cohorts AS (
  SELECT id AS user_id, date_trunc('month',created_at)::date AS cohort_date FROM public.profiles
), activity AS (
  SELECT profile_id AS user_id, coalesce(validated_at,submitted_at,pagado_en) AS activity_at
    FROM public.payments WHERE payment_status='approved' OR estado::text='aprobado'
  UNION ALL SELECT profile_id,entregado_en FROM public.payouts WHERE entregado_en IS NOT NULL
  UNION ALL SELECT profile_id,created_at FROM public.junta_members
    WHERE estado::text IN ('activo','moroso','retirado')
  UNION ALL SELECT admin_id,created_at FROM public.juntas WHERE estado::text <> 'eliminada'
), sizes AS (
  SELECT cohort_date, count(*) AS cohort_size FROM cohorts GROUP BY cohort_date
), retained AS (
  SELECT c.cohort_date,(extract(year FROM age(date_trunc('month',a.activity_at),c.cohort_date))*12
    + extract(month FROM age(date_trunc('month',a.activity_at),c.cohort_date)))::int AS period_number,
    count(DISTINCT c.user_id) AS active_users
  FROM cohorts c JOIN activity a ON a.user_id=c.user_id AND a.activity_at>=c.cohort_date
  GROUP BY c.cohort_date,period_number
)
SELECT r.cohort_date,s.cohort_size,r.period_number,r.active_users,
  round(100.0*r.active_users/nullif(s.cohort_size,0),2) AS retention_rate
FROM retained r JOIN sizes s USING(cohort_date)
WHERE r.period_number IN (0,1,2,3,4,8) ORDER BY r.cohort_date,r.period_number;

-- ============================================================================
-- 11_repeat_juntas.csv
-- ============================================================================
WITH participations AS (
  SELECT jm.profile_id AS user_id, jm.junta_id, jm.created_at AS joined_at,
    CASE WHEN j.estado::text='cerrada' THEN max(po.entregado_en) END AS completed_at_estimated
  FROM public.junta_members jm JOIN public.juntas j ON j.id=jm.junta_id
  LEFT JOIN public.payouts po ON po.junta_id=jm.junta_id
  GROUP BY jm.profile_id,jm.junta_id,jm.created_at,j.estado
), ordered AS (
  SELECT *, row_number() OVER(PARTITION BY user_id ORDER BY joined_at,junta_id) AS seq FROM participations
), per_user AS (
  SELECT user_id, min(joined_at) AS first_junta_date,
    min(completed_at_estimated) AS first_completed_junta_date,
    min(joined_at) FILTER(WHERE seq=2) AS second_junta_date,
    count(*) AS total_juntas_joined,
    count(*) FILTER(WHERE completed_at_estimated IS NOT NULL) AS total_juntas_completed
  FROM ordered GROUP BY user_id
), repeats AS (
  SELECT u.user_id, u.first_completed_junta_date,
    min(p.joined_at) AS next_junta_after_completion
  FROM per_user u LEFT JOIN participations p ON p.user_id=u.user_id
   AND p.joined_at>u.first_completed_junta_date WHERE u.first_completed_junta_date IS NOT NULL
  GROUP BY u.user_id,u.first_completed_junta_date
), detail AS (
  SELECT 'user'::text AS row_type,user_id,first_junta_date,first_completed_junta_date,second_junta_date,
    extract(epoch FROM (second_junta_date-first_junta_date))/86400.0 AS days_to_second_junta,
    total_juntas_joined,total_juntas_completed,
    NULL::bigint AS users_with_completed_junta,
    NULL::bigint AS users_who_joined_another_after_completion,
    NULL::numeric AS repeat_junta_rate,
    NULL::numeric AS average_days_to_next_junta,
    NULL::numeric AS median_days_to_next_junta FROM per_user
), summary AS (
  SELECT 'summary'::text,NULL::uuid,NULL::timestamptz,NULL::timestamptz,NULL::timestamptz,
    NULL::numeric,NULL::bigint,NULL::bigint,count(*),
    count(*) FILTER(WHERE next_junta_after_completion IS NOT NULL),
    round(100.0*count(*) FILTER(WHERE next_junta_after_completion IS NOT NULL)/nullif(count(*),0),2),
    round(avg(extract(epoch FROM (next_junta_after_completion-first_completed_junta_date))/86400.0),2),
    round((percentile_cont(.5) WITHIN GROUP(ORDER BY extract(epoch FROM
      (next_junta_after_completion-first_completed_junta_date))/86400.0))::numeric,2) FROM repeats
)
SELECT * FROM detail UNION ALL SELECT * FROM summary ORDER BY row_type,user_id;

-- ============================================================================
-- 12_payment_reliability.csv
-- ============================================================================
WITH obligations AS (
  SELECT ps.id AS schedule_id, ps.junta_id,
    ps.fecha_vencimiento AS due_date, payer.profile_id AS payer_id
  FROM public.payment_schedules AS ps
  JOIN public.junta_members AS payer ON payer.junta_id = ps.junta_id
   AND payer.orden_turno <> ps.cuota_numero
   AND payer.created_at < ps.fecha_vencimiento::timestamptz + interval '1 day'
   AND (payer.left_at IS NULL OR payer.left_at >= ps.fecha_vencimiento::timestamptz)
  WHERE ps.fecha_vencimiento <= current_date
), payer_scores AS MATERIALIZED (
  SELECT payer_id, public.current_junta_score(payer_id) AS current_score
  FROM (SELECT DISTINCT payer_id FROM obligations) AS distinct_payers
), latest AS (
  SELECT DISTINCT ON (junta_id, schedule_id, profile_id) *
  FROM public.payments
  ORDER BY junta_id, schedule_id, profile_id,
    coalesce(submitted_at, pagado_en, created_at) DESC
), facts AS (
  SELECT date_trunc('month', o.due_date)::date AS period_month,
    CASE WHEN ps.current_score <= 39 THEN '0-39'
      WHEN ps.current_score <= 59 THEN '40-59'
      WHEN ps.current_score <= 79 THEN '60-79' ELSE '80-100' END AS score_band,
    coalesce(l.payment_status = 'approved' OR l.estado::text = 'aprobado', false) AS confirmed,
    coalesce(l.submitted_at, l.pagado_en) AS paid_at,
    o.due_date::timestamptz + interval '1 day' AS deadline_at
  FROM obligations AS o
  JOIN payer_scores AS ps ON ps.payer_id = o.payer_id
  LEFT JOIN latest AS l ON l.junta_id = o.junta_id
   AND l.schedule_id = o.schedule_id AND l.profile_id = o.payer_id
)
SELECT period_month, score_band, count(*) AS expected_payments,
  count(*) FILTER (WHERE confirmed) AS confirmed_payments,
  count(*) FILTER (WHERE confirmed AND paid_at < deadline_at) AS on_time_payments,
  count(*) FILTER (WHERE confirmed AND paid_at >= deadline_at) AS late_payments,
  count(*) FILTER (WHERE NOT confirmed) AS unpaid_payments,
  round(100.0 * count(*) FILTER (WHERE confirmed AND paid_at < deadline_at)
    / nullif(count(*), 0), 2) AS on_time_payment_rate,
  round(100.0 * count(*) FILTER (WHERE confirmed)
    / nullif(count(*), 0), 2) AS payment_completion_rate,
  round(avg(greatest(extract(epoch FROM (paid_at - deadline_at))::numeric
    / 86400.0, 0)) FILTER (WHERE confirmed), 2) AS average_days_late,
  round((percentile_cont(.5) WITHIN GROUP (ORDER BY greatest(
    extract(epoch FROM (paid_at - deadline_at)) / 86400.0, 0))
    FILTER (WHERE confirmed))::numeric, 2) AS median_days_late
FROM facts
GROUP BY period_month, score_band
ORDER BY period_month, score_band;

-- ============================================================================
-- 13_juntealo_volume.csv
-- Official amount: payments.submitted_amount, falling back to payments.monto.
-- ============================================================================
WITH confirmed AS (
  SELECT p.id AS payment_id, p.junta_id, p.profile_id AS payer_id,
    receiver.profile_id AS receiver_id, j.moneda AS currency,
    coalesce(p.submitted_amount,p.monto) AS confirmed_amount,
    coalesce(p.validated_at,p.submitted_at,p.pagado_en) AS confirmed_at
  FROM public.payments p JOIN public.juntas j ON j.id=p.junta_id
  JOIN public.payment_schedules ps ON ps.id=p.schedule_id
  LEFT JOIN public.junta_members receiver ON receiver.junta_id=p.junta_id
   AND receiver.orden_turno=ps.cuota_numero
  WHERE p.payment_status='approved' OR p.estado::text='aprobado'
)
SELECT date_trunc('month',confirmed_at)::date AS period_month, currency,
  count(DISTINCT junta_id) AS active_juntas,
  count(DISTINCT payer_id) AS unique_payers,
  count(DISTINCT receiver_id) AS unique_receivers,
  count(DISTINCT payment_id) AS confirmed_payments,
  sum(confirmed_amount) AS total_confirmed_volume,
  round(avg(confirmed_amount),2) AS average_payment,
  round((percentile_cont(.5) WITHIN GROUP
    (ORDER BY confirmed_amount))::numeric,2) AS median_payment,
  round(sum(confirmed_amount)/nullif(count(DISTINCT junta_id),0),2) AS average_volume_per_active_junta
FROM confirmed WHERE confirmed_at IS NOT NULL
GROUP BY period_month,currency ORDER BY period_month,currency;

-- ============================================================================
-- 14_virality.csv
-- K-factor stays NULL because invites cannot be connected to signup/join events.
-- ============================================================================
WITH months AS (
  SELECT date_trunc('month',created_at)::date AS period_month FROM public.invitations
  UNION SELECT date_trunc('month',created_at)::date FROM public.referrals
), invites AS (
  SELECT date_trunc('month',created_at)::date AS period_month,
    count(*) AS invitations_sent,
    count(*) FILTER(WHERE estado::text='aceptada') AS invitations_accepted,
    count(DISTINCT enviado_por) AS inviters
  FROM public.invitations GROUP BY period_month
), referrals AS (
  SELECT date_trunc('month',created_at)::date AS period_month,
    count(*) AS registered,
    count(*) FILTER(WHERE status='active') AS activated
  FROM public.referrals GROUP BY period_month
)
SELECT m.period_month, coalesce(i.invitations_sent,0) AS invitations_sent,
  coalesce(i.invitations_accepted,0) AS invitations_accepted,
  coalesce(r.registered,0) AS users_registered_via_invitation,
  NULL::bigint AS users_joined_junta_via_invitation,
  round(i.invitations_sent::numeric/nullif(i.inviters,0),2) AS invites_per_inviter,
  round(100.0*i.invitations_accepted/nullif(i.invitations_sent,0),2) AS invite_acceptance_rate,
  NULL::numeric AS invite_registration_conversion,
  NULL::numeric AS invite_join_conversion,
  round(100.0*r.activated/nullif(r.registered,0),2) AS referral_first_payment_conversion,
  NULL::numeric AS approximate_k_factor
FROM months AS m LEFT JOIN invites AS i USING(period_month)
LEFT JOIN referrals AS r USING(period_month)
ORDER BY m.period_month;

-- ============================================================================
-- 15_monthly_active_savers.csv
-- ============================================================================
WITH confirmed AS (
  SELECT p.id AS payment_id, p.junta_id, p.profile_id AS payer_id,
    receiver.profile_id AS receiver_id, j.moneda AS currency,
    coalesce(p.submitted_amount,p.monto) AS confirmed_amount,
    coalesce(p.validated_at,p.submitted_at,p.pagado_en) AS confirmed_at
  FROM public.payments p JOIN public.juntas j ON j.id=p.junta_id
  JOIN public.payment_schedules ps ON ps.id=p.schedule_id
  LEFT JOIN public.junta_members receiver ON receiver.junta_id=p.junta_id
   AND receiver.orden_turno=ps.cuota_numero
  WHERE (p.payment_status='approved' OR p.estado::text='aprobado')
    AND j.estado::text NOT IN ('eliminada','bloqueada') AND NOT coalesce(j.bloqueada,false)
    AND coalesce(p.validated_at,p.submitted_at,p.pagado_en) IS NOT NULL
), active_saver_users AS (
  SELECT date_trunc('month',confirmed_at)::date AS period_month,
    currency, payer_id AS user_id FROM confirmed
  UNION
  SELECT date_trunc('month',confirmed_at)::date AS period_month,
    currency, receiver_id AS user_id FROM confirmed WHERE receiver_id IS NOT NULL
), monthly AS (
  SELECT date_trunc('month',confirmed_at)::date AS period_month, currency,
    count(DISTINCT payer_id) AS paying_users,
    count(DISTINCT receiver_id) AS receiving_users,
    count(DISTINCT junta_id) AS active_juntas,
    count(*) AS confirmed_payments,
    sum(confirmed_amount) AS total_confirmed_volume
  FROM confirmed GROUP BY period_month,currency
), mas AS (
  SELECT period_month, currency,
    count(DISTINCT user_id) AS monthly_active_savers
  FROM active_saver_users GROUP BY period_month,currency
)
SELECT m.period_month,m.currency,mas.monthly_active_savers,m.paying_users,m.receiving_users,
  m.active_juntas,m.total_confirmed_volume,
  round(m.confirmed_payments::numeric/nullif(mas.monthly_active_savers,0),2) AS payments_per_active_saver,
  round(m.total_confirmed_volume/nullif(mas.monthly_active_savers,0),2) AS volume_per_active_saver
FROM monthly AS m JOIN mas USING(period_month,currency)
ORDER BY m.period_month,m.currency;

-- ============================================================================
-- 16_product_metrics_summary.csv
-- Compact executive output assembled from the same audited sources.
-- Monetary rows remain separated by currency.
-- ============================================================================
WITH months AS (
  SELECT generate_series(date_trunc('month',least(
    coalesce((SELECT min(created_at) FROM public.profiles),now()),
    coalesce((SELECT min(created_at) FROM public.juntas),now()))),
    date_trunc('month',current_date),interval '1 month')::date AS period_month
), currencies AS (
  SELECT DISTINCT moneda AS currency FROM public.juntas
), member_stats AS (
  SELECT jm.junta_id,
    count(DISTINCT jm.profile_id) FILTER (WHERE jm.estado::text <> 'retirado') AS participants,
    max(jm.created_at) FILTER (WHERE jm.estado::text <> 'retirado') AS roster_filled_at
  FROM public.junta_members AS jm GROUP BY jm.junta_id
), schedule_stats AS (
  SELECT ps.junta_id, min(ps.created_at) AS first_schedule_at
  FROM public.payment_schedules AS ps GROUP BY ps.junta_id
), payout_stats AS (
  SELECT po.junta_id, max(po.entregado_en) AS last_payout_at
  FROM public.payouts AS po GROUP BY po.junta_id
), jf AS (
  SELECT j.id, j.moneda AS currency, j.created_at, j.participantes_max,
    coalesce(ms.participants, 0) AS participants,
    CASE WHEN coalesce(ms.participants, 0) >= j.participantes_max
      THEN ms.roster_filled_at END AS filled_at,
    -- Approximation: the first generated payment schedule marks activation.
    ss.first_schedule_at AS activated_at,
    -- Approximation: the last delivered payout marks completion for closed juntas.
    CASE WHEN j.estado::text = 'cerrada' THEN pos.last_payout_at END AS completed_at
  FROM public.juntas AS j
  LEFT JOIN member_stats AS ms ON ms.junta_id = j.id
  LEFT JOIN schedule_stats AS ss ON ss.junta_id = j.id
  LEFT JOIN payout_stats AS pos ON pos.junta_id = j.id
), latest AS (
  SELECT DISTINCT ON(junta_id,schedule_id,profile_id) * FROM public.payments
  ORDER BY junta_id,schedule_id,profile_id,coalesce(submitted_at,pagado_en,created_at) DESC
), obligations AS (
  SELECT j.moneda AS currency, ps.junta_id, ps.id AS schedule_id, ps.fecha_vencimiento,
    payer.profile_id AS payer_id, receiver.profile_id AS receiver_id,
    coalesce(l.payment_status='approved' OR l.estado::text='aprobado',false) AS confirmed,
    coalesce(l.submitted_at,l.pagado_en) AS paid_at,
    coalesce(l.submitted_amount,l.monto) AS amount,
    coalesce(l.validated_at,l.submitted_at,l.pagado_en) AS confirmed_at
  FROM public.payment_schedules ps JOIN public.juntas j ON j.id=ps.junta_id
  JOIN public.junta_members payer ON payer.junta_id=ps.junta_id AND payer.orden_turno<>ps.cuota_numero
   AND payer.created_at<ps.fecha_vencimiento::timestamptz+interval '1 day'
   AND (payer.left_at IS NULL OR payer.left_at>=ps.fecha_vencimiento::timestamptz)
  LEFT JOIN public.junta_members receiver ON receiver.junta_id=ps.junta_id
   AND receiver.orden_turno=ps.cuota_numero
  LEFT JOIN latest l ON l.junta_id=ps.junta_id AND l.schedule_id=ps.id
   AND l.profile_id=payer.profile_id
), saver_users AS (
  SELECT date_trunc('month',confirmed_at)::date AS period_month,
    currency, payer_id AS user_id
    FROM obligations WHERE confirmed AND confirmed_at IS NOT NULL
  UNION
  SELECT date_trunc('month',confirmed_at)::date AS period_month,
    currency, receiver_id AS user_id
    FROM obligations WHERE confirmed AND confirmed_at IS NOT NULL
      AND receiver_id IS NOT NULL
), monthly AS (
  SELECT m.period_month,c.currency,
    (SELECT count(*) FROM public.profiles p WHERE date_trunc('month',p.created_at)::date=m.period_month) AS new_users,
    (SELECT count(DISTINCT e.profile_id) FROM public.user_activity_events e
      WHERE date_trunc('month',e.occurred_at)::date=m.period_month) AS active_users,
    (SELECT count(DISTINCT su.user_id) FROM saver_users su
      WHERE su.period_month=m.period_month AND su.currency=c.currency) AS monthly_active_savers,
    count(DISTINCT jf.id) FILTER(WHERE date_trunc('month',jf.created_at)::date=m.period_month) AS juntas_created,
    count(DISTINCT jf.id) FILTER(WHERE date_trunc('month',jf.activated_at)::date=m.period_month) AS juntas_activated,
    count(DISTINCT jf.id) FILTER(WHERE date_trunc('month',jf.completed_at)::date=m.period_month) AS juntas_completed,
    round(avg(jf.participants::numeric/nullif(jf.participantes_max,0)) FILTER
      (WHERE date_trunc('month',jf.created_at)::date=m.period_month),4) AS average_fill_rate,
    round((percentile_cont(.5) WITHIN GROUP(ORDER BY extract(epoch FROM (jf.filled_at-jf.created_at))/86400.0)
      FILTER(WHERE jf.filled_at IS NOT NULL AND date_trunc('month',jf.created_at)::date=m.period_month))::numeric,2) AS median_time_to_fill,
    round((percentile_cont(.5) WITHIN GROUP(ORDER BY extract(epoch FROM (jf.activated_at-jf.created_at))/86400.0)
      FILTER(WHERE jf.activated_at IS NOT NULL AND date_trunc('month',jf.created_at)::date=m.period_month))::numeric,2) AS median_time_to_activation,
    (SELECT count(*) FROM obligations o WHERE o.currency=c.currency AND o.confirmed
      AND date_trunc('month',o.confirmed_at)::date=m.period_month) AS confirmed_payments,
    (SELECT round(100.0*count(*) FILTER(WHERE o.confirmed)/nullif(count(*),0),2)
      FROM obligations o WHERE o.currency=c.currency AND o.fecha_vencimiento<=current_date
       AND date_trunc('month',o.fecha_vencimiento)::date=m.period_month) AS payment_completion_rate,
    (SELECT round(100.0*count(*) FILTER(WHERE o.confirmed AND o.paid_at<o.fecha_vencimiento::timestamptz+interval '1 day')
      /nullif(count(*) FILTER(WHERE o.confirmed),0),2) FROM obligations o
      WHERE o.currency=c.currency AND o.fecha_vencimiento<=current_date
       AND date_trunc('month',o.fecha_vencimiento)::date=m.period_month) AS on_time_payment_rate,
    coalesce((SELECT sum(o.amount) FROM obligations o
      WHERE o.currency=c.currency AND o.confirmed
       AND date_trunc('month',o.confirmed_at)::date=m.period_month), 0) AS total_confirmed_volume,
    (SELECT round(100.0*count(*) FILTER(WHERE x.juntas_joined>=2)/nullif(count(*),0),2)
      FROM (SELECT jm.profile_id,
          count(DISTINCT jm.junta_id) AS juntas_joined
        FROM public.junta_members jm
        WHERE jm.created_at < m.period_month + interval '1 month'
        GROUP BY jm.profile_id) x) AS repeat_junta_rate,
    (SELECT count(*) FROM public.referrals r WHERE date_trunc('month',r.created_at)::date=m.period_month) AS referred_users,
    (SELECT round(100.0*count(*) FILTER(WHERE i.estado::text='aceptada')/nullif(count(*),0),2)
      FROM public.invitations i WHERE date_trunc('month',i.created_at)::date=m.period_month) AS invite_conversion_rate,
    (SELECT count(DISTINCT o.junta_id) FROM obligations o WHERE o.currency=c.currency AND o.confirmed
      AND date_trunc('month',o.confirmed_at)::date=m.period_month) AS active_juntas
  FROM months m CROSS JOIN currencies c LEFT JOIN jf ON jf.currency=c.currency
  GROUP BY m.period_month,c.currency
), calculated AS (
  SELECT *,round(100.0*juntas_activated/nullif(juntas_created,0),2) AS junta_activation_rate,
    round(100.0*referred_users/nullif(new_users,0),2) AS referral_percentage,
    round(100.0*(new_users-referred_users)/nullif(new_users,0),2) AS non_referral_percentage
  FROM monthly
)
SELECT *,
  round(100.0*(new_users-lag(new_users) OVER w)/nullif(lag(new_users) OVER w,0),2) AS user_growth_mom,
  round(100.0*(monthly_active_savers-lag(monthly_active_savers) OVER w)
    /nullif(lag(monthly_active_savers) OVER w,0),2) AS mas_growth_mom,
  round(100.0*(total_confirmed_volume-lag(total_confirmed_volume) OVER w)
    /nullif(lag(total_confirmed_volume) OVER w,0),2) AS volume_growth_mom,
  round(100.0*(active_juntas-lag(active_juntas) OVER w)
    /nullif(lag(active_juntas) OVER w,0),2) AS active_juntas_growth_mom
FROM calculated WINDOW w AS(PARTITION BY currency ORDER BY period_month)
ORDER BY period_month,currency;
