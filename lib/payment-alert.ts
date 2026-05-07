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

  // Derive the current cuota_numero per junta from completed payouts.
  // Only schedules for the active turno (completedPayouts + 1) are considered —
  // this prevents past-turno vencida schedules from polluting the banner.
  const currentCuotaByJunta = new Map<string, number>();
  if (params.payouts) {
    for (const juntaId of params.myJuntaIds) {
      const completed = params.payouts.filter((p) => p.junta_id === juntaId).length;
      currentCuotaByJunta.set(juntaId, completed + 1);
    }
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

      if (process.env.NODE_ENV === 'development') {
        console.debug('[DASHBOARD PAYMENT NOTIFICATIONS]', {
          profileId: params.userId,
          juntaId: schedule.junta_id,
          scheduleId: schedule.id,
          paymentEstado: payment?.estado ?? null,
          paymentStatus: payment?.payment_status ?? null,
          normalizedStatus: normalizedStatus ?? 'no_payment',
          shouldShowNotification: normalizedStatus == null || normalizedStatus === 'rejected' || normalizedStatus === 'overdue' || normalizedStatus === 'pending',
        });
      }

      return { schedule, payment, normalizedStatus };
    })
    // Suppress approved (and any Spanish equivalents via normalization) — rejected stays visible to re-pay
    .filter((item) => item.normalizedStatus !== 'approved')
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

  // Check via normalized status so both 'submitted'/'validating' (store) and
  // 'pendiente_aprobacion' (DB-native Spanish) are handled correctly.
  if (next.normalizedStatus === 'submitted' || next.normalizedStatus === 'validating') {
    return {
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
  }

  if (dueDate.getTime() < now.getTime()) {
    return {
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
  }

  if (isSameDay(dueDate, now)) {
    return {
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
  }

  return {
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
