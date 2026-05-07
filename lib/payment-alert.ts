import { format, formatDistanceToNowStrict, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Junta, Payment, PaymentSchedule, Payout } from '@/types/domain';
import { normalizePaymentStatus } from './payment-status';

export type PaymentAlertStatus = 'upcoming' | 'due_today' | 'overdue' | 'paid' | 'none' | 'en_validacion';

export type PaymentAlertState = {
  status: PaymentAlertStatus;
  tone?: 'neutral' | 'warning' | 'destructive';
  title: string;
  subtitle: string;
  amount?: number;
  dueDate?: Date;
  dueTime?: string | null;
  remainingText?: string | null;
  juntaId?: string;
  cuotaId?: string;
  juntaNombre?: string;
  hasMultiplePending?: boolean;
};

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseDueDate(value: string) {
  if (DATE_ONLY_REGEX.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return {
      dueDate: new Date(year, month - 1, day, 23, 59, 59, 999),
      dueTime: null
    };
  }

  const due = new Date(value);
  if (!Number.isNaN(due.getTime())) {
    return {
      dueDate: due,
      dueTime: format(due, 'HH:mm')
    };
  }

  // fallback defensivo para valores malformados
  return {
    dueDate: new Date(),
    dueTime: null
  };
}

function getRemainingText(dueDate: Date, now: Date) {
  const diffMs = dueDate.getTime() - now.getTime();
  if (diffMs <= 0) return null;

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours <= 0) return 'Queda menos de 1 hora.';
  return `Quedan ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}.`;
}

// Normalize payment estado using both payment_status (reliable English field from DB)
// and estado (may be Spanish DB-native like 'pendiente_aprobacion' or English from store).
function resolvePaymentNormalizedStatus(payment: Payment) {
  return normalizePaymentStatus(payment.payment_status ?? payment.estado);
}

function isApprovedOrSubmittedPayment(payment: Payment): boolean {
  const estado = (payment.estado ?? '') as string;
  const paymentStatus = (payment.payment_status ?? '') as string;
  return (
    estado === 'aprobado' || estado === 'pendiente_aprobacion' || estado === 'approved' ||
    paymentStatus === 'approved' || paymentStatus === 'submitted'
  );
}

export function getPaymentAlertState(params: {
  userId: string;
  myJuntaIds: string[];
  juntas: Junta[];
  schedules: PaymentSchedule[];
  payments: Payment[];
  payouts?: Payout[];
  now?: Date;
}): PaymentAlertState {
  const now = params.now ?? new Date();

  // Derive the current cuota_numero per junta from DELIVERED payouts only.
  // entregado_en marks actual disbursement — pre-assigned but undelivered payouts
  // must NOT be counted, otherwise currentCuota is inflated and no schedule matches.
  const currentCuotaByJunta = new Map<string, number>();
  if (params.payouts) {
    for (const juntaId of params.myJuntaIds) {
      const completed = params.payouts.filter((p) => p.junta_id === juntaId && p.entregado_en != null).length;
      currentCuotaByJunta.set(juntaId, completed + 1);
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.debug('[PAYMENT ALERT] candidateSchedules (pre-filter)', {
      userId: params.userId,
      activeJuntaIds: params.myJuntaIds,
      payoutsTotal: (params.payouts ?? []).length,
      payoutsDelivered: (params.payouts ?? []).filter((p) => p.entregado_en != null).length,
      currentCuotaByJunta: Object.fromEntries(currentCuotaByJunta),
      candidateSchedules: params.schedules.map((s) => ({ id: s.id, juntaId: s.junta_id, cuotaNumero: s.cuota_numero, estado: s.estado, monto: s.monto, fechaVencimiento: s.fecha_vencimiento })),
      validPayments: params.payments.filter((p) => p.profile_id === params.userId).map((p) => ({ id: p.id, juntaId: p.junta_id, scheduleId: p.schedule_id, estado: p.estado, paymentStatus: p.payment_status })),
    });
  }

  const pendingCandidates = params.schedules
    .filter((schedule) => params.myJuntaIds.includes(schedule.junta_id))
    .filter((schedule) => schedule.estado === 'pendiente' || schedule.estado === 'vencida')
    .filter((schedule) => {
      const currentCuota = currentCuotaByJunta.get(schedule.junta_id);
      return currentCuota === undefined || schedule.cuota_numero === currentCuota;
    })
    .map((schedule) => {
      const payment = params.payments.find(
        (item) =>
          item.profile_id === params.userId
          && item.junta_id === schedule.junta_id
          && item.schedule_id === schedule.id
      );
      const normalizedStatus = payment ? resolvePaymentNormalizedStatus(payment) : undefined;

      // isCoveredBySubmittedOrApprovedPayment: true when the exact schedule_id match
      // has a valid (approved/submitted) payment. Used to suppress the overdue banner.
      // When payment.schedule_id is null (unlinked payment), this will be false and the
      // SQL-level NOT EXISTS filter is the authoritative guard in that scenario.
      const isCoveredBySubmittedOrApprovedPayment = payment != null && isApprovedOrSubmittedPayment(payment);

      // Detect unlinked-payment edge case for debugging.
      const hasUnlinkedValidPaymentInJunta =
        !payment &&
        params.payments.some(
          (p) =>
            p.profile_id === params.userId &&
            p.junta_id === schedule.junta_id &&
            p.schedule_id == null &&
            isApprovedOrSubmittedPayment(p)
        );

      const derivedAlertType =
        isCoveredBySubmittedOrApprovedPayment
          ? normalizedStatus === 'submitted' || normalizedStatus === 'validating'
            ? 'en_validacion'
            : 'none'
          : normalizedStatus == null
          ? new Date(schedule.fecha_vencimiento) < new Date()
            ? 'overdue'
            : 'upcoming'
          : normalizedStatus;

      if (process.env.NODE_ENV === 'development') {
        console.debug('[DASHBOARD PAYMENT NOTIFICATIONS]', {
          profileId: params.userId,
          juntaId: schedule.junta_id,
          scheduleId: schedule.id,
          scheduleEstado: schedule.estado,
          paymentId: payment?.id ?? null,
          estado: payment?.estado ?? null,
          payment_status: payment?.payment_status ?? null,
          normalizedStatus: normalizedStatus ?? 'no_payment',
          isCoveredBySubmittedOrApprovedPayment,
          hasUnlinkedValidPaymentInJunta,
          finalAlertType: derivedAlertType,
        });

        if (hasUnlinkedValidPaymentInJunta) {
          console.warn(
            '[DASHBOARD PAYMENT NOTIFICATIONS] schedule_id=null on a valid payment — ' +
            'schedule cannot be auto-covered in frontend. Apply SQL migration to fix at source.',
            { scheduleId: schedule.id, juntaId: schedule.junta_id }
          );
        }
      }

      return { schedule, payment, normalizedStatus, isCoveredBySubmittedOrApprovedPayment };
    })
    // Suppress schedules already paid (approved). Submitted stays to show en_validacion.
    // isCoveredBySubmittedOrApprovedPayment is true for both approved and submitted, but
    // submitted also has normalizedStatus='submitted' which triggers en_validacion above.
    .filter((item) => {
      // Approved: remove entirely — no banner needed
      if (item.normalizedStatus === 'approved') return false;
      // Covered by approved payment (isCovered=true, normalizedStatus NOT submitted/validating)
      // handles the unlikely case where isCovered diverges from normalizedStatus.
      if (item.isCoveredBySubmittedOrApprovedPayment && item.normalizedStatus !== 'submitted' && item.normalizedStatus !== 'validating') return false;
      return true;
    })
    .sort((a, b) => new Date(a.schedule.fecha_vencimiento).getTime() - new Date(b.schedule.fecha_vencimiento).getTime());

  const hasPaidCandidate = params.schedules
    .filter((schedule) => params.myJuntaIds.includes(schedule.junta_id))
    .filter((schedule) => schedule.estado === 'pendiente' || schedule.estado === 'vencida' || schedule.estado === 'pagada')
    .some((schedule) => params.payments.some((payment) => {
      if (
        payment.profile_id !== params.userId
        || payment.junta_id !== schedule.junta_id
        || payment.schedule_id !== schedule.id
      ) return false;
      return resolvePaymentNormalizedStatus(payment) === 'approved';
    }));

  if (process.env.NODE_ENV === 'development') {
    console.debug('[PAYMENT ALERT] pendingCandidates (post-filter)', {
      userId: params.userId,
      count: pendingCandidates.length,
      candidates: pendingCandidates.map((c) => ({
        scheduleId: c.schedule.id,
        juntaId: c.schedule.junta_id,
        cuotaNumero: c.schedule.cuota_numero,
        monto: c.schedule.monto,
        dueDate: c.schedule.fecha_vencimiento,
        scheduleEstado: c.schedule.estado,
        paymentId: c.payment?.id ?? null,
        paymentEstado: c.payment?.estado ?? null,
        normalizedStatus: c.normalizedStatus ?? 'no_payment',
        isCovered: c.isCoveredBySubmittedOrApprovedPayment,
      })),
    });
  }

  if (pendingCandidates.length === 0) {
    return {
      status: hasPaidCandidate ? 'paid' : 'none',
      tone: 'neutral',
      title: '',
      subtitle: ''
    };
  }

  const next = pendingCandidates[0];
  const junta = params.juntas.find((item) => item.id === next.schedule.junta_id);
  if (!junta) {
    return {
      status: 'none',
      tone: 'neutral',
      title: '',
      subtitle: ''
    };
  }

  const { dueDate, dueTime } = parseDueDate(next.schedule.fecha_vencimiento);
  const remainingText = getRemainingText(dueDate, now);

  let result: PaymentAlertState;

  // Check via normalized status so both 'submitted'/'validating' (store) and
  // 'pendiente_aprobacion' (DB-native Spanish) are handled correctly.
  if (next.normalizedStatus === 'submitted' || next.normalizedStatus === 'validating') {
    result = {
      status: 'en_validacion',
      tone: 'neutral',
      title: `Tu pago de ${junta.nombre} está en validación`,
      subtitle: `S/${next.schedule.monto.toFixed(2)} · Será confirmado por el receptor.`,
      amount: next.schedule.monto,
      dueDate,
      dueTime,
      remainingText: null,
      juntaId: junta.id,
      cuotaId: next.schedule.id,
      juntaNombre: junta.nombre,
      hasMultiplePending: pendingCandidates.length > 1
    };
  } else if (dueDate.getTime() < now.getTime()) {
    result = {
      status: 'overdue',
      tone: 'destructive',
      title: `Tienes un pago vencido de S/${next.schedule.monto.toFixed(2)}`,
      subtitle: `Venció el ${format(dueDate, "dd 'de' MMMM, HH:mm", { locale: es })} (${formatDistanceToNowStrict(dueDate, { addSuffix: true, locale: es })}).`,
      amount: next.schedule.monto,
      dueDate,
      dueTime,
      remainingText: null,
      juntaId: junta.id,
      cuotaId: next.schedule.id,
      juntaNombre: junta.nombre,
      hasMultiplePending: pendingCandidates.length > 1
    };
  } else if (isSameDay(dueDate, now)) {
    result = {
      status: 'due_today',
      tone: 'warning',
      title: `Tienes hasta hoy ${dueTime ?? '23:59'} para pagar S/${next.schedule.monto.toFixed(2)}`,
      subtitle: `${junta.nombre}. ${remainingText ?? ''}`.trim(),
      amount: next.schedule.monto,
      dueDate,
      dueTime,
      remainingText,
      juntaId: junta.id,
      cuotaId: next.schedule.id,
      juntaNombre: junta.nombre,
      hasMultiplePending: pendingCandidates.length > 1
    };
  } else {
    result = {
      status: 'upcoming',
      tone: 'warning',
      title: `Tu próximo pago vence el ${format(dueDate, "dd 'de' MMMM, HH:mm", { locale: es })}`,
      subtitle: `${junta.nombre} · S/${next.schedule.monto.toFixed(2)}`,
      amount: next.schedule.monto,
      dueDate,
      dueTime,
      remainingText,
      juntaId: junta.id,
      cuotaId: next.schedule.id,
      juntaNombre: junta.nombre,
      hasMultiplePending: pendingCandidates.length > 1
    };
  }

  if (process.env.NODE_ENV === 'development') {
    console.debug('[PAYMENT ALERT] finalPaymentAlert', {
      status: result.status,
      juntaId: result.juntaId,
      juntaNombre: result.juntaNombre,
      scheduleId: result.cuotaId,
      cuotaNumero: next.schedule.cuota_numero,
      monto: result.amount,
      dueDate: result.dueDate?.toISOString() ?? null,
      paymentId: next.payment?.id ?? null,
      paymentEstado: next.payment?.estado ?? 'sin_pago',
      paymentStatus: next.payment?.payment_status ?? null,
      isCovered: next.isCoveredBySubmittedOrApprovedPayment,
    });
  }

  return result;
}
