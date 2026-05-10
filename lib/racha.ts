import type { Payment, PaymentSchedule } from '@/types/domain';

export type EstadoRacha = 'activa' | 'en_riesgo' | 'rota';

export type RachaResult = {
  semanasActual: number;
  recordPersonal: number;
  proximoHito: number;
  estado: EstadoRacha;
  horasRestantes?: number;
};

const VALID_PAYMENT_STATES = new Set(['pending', 'submitted', 'validating', 'approved']);
const HORAS_EN_RIESGO = 48;

export function getProximoHito(semanas: number): number {
  if (semanas < 4) return 4;
  if (semanas < 8) return 8;
  return 12;
}

export function computeJuntaRacha(params: {
  juntaId: string;
  userId: string;
  payments: Payment[];
  schedules: PaymentSchedule[];
  now?: Date;
}): RachaResult {
  const { juntaId, userId, payments, schedules } = params;
  const now = params.now ?? new Date();

  const juntaSchedules = schedules
    .filter((s) => s.junta_id === juntaId)
    .sort((a, b) => a.cuota_numero - b.cuota_numero);

  const userPayments = payments.filter(
    (p) => p.junta_id === juntaId && p.profile_id === userId && VALID_PAYMENT_STATES.has(p.estado),
  );

  // Mark schedules as paid on time using submitted_at (the moment user registered the payment)
  const paidOnTimeSet = new Set<string>();
  for (const schedule of juntaSchedules) {
    const deadline = new Date(schedule.fecha_vencimiento);
    const paid = userPayments.some((p) => {
      if (p.schedule_id !== schedule.id) return false;
      const registeredAt = new Date(p.submitted_at ?? p.pagado_en);
      return registeredAt <= deadline;
    });
    if (paid) paidOnTimeSet.add(schedule.id);
  }

  const pastSchedules = juntaSchedules.filter((s) => new Date(s.fecha_vencimiento) < now);
  const currentSchedule = juntaSchedules.find((s) => new Date(s.fecha_vencimiento) >= now) ?? null;

  // Walk backwards from most recent past to count consecutive on-time payments
  let streak = 0;
  for (let i = pastSchedules.length - 1; i >= 0; i--) {
    if (paidOnTimeSet.has(pastSchedules[i].id)) {
      streak++;
    } else {
      break;
    }
  }

  // Compute personal record across all past periods
  let record = streak;
  let runningStreak = 0;
  for (const s of pastSchedules) {
    if (paidOnTimeSet.has(s.id)) {
      runningStreak++;
      record = Math.max(record, runningStreak);
    } else {
      runningStreak = 0;
    }
  }

  let estado: EstadoRacha;
  let horasRestantes: number | undefined;

  if (currentSchedule) {
    const deadline = new Date(currentSchedule.fecha_vencimiento);
    const currentPaid = userPayments.some((p) => {
      if (p.schedule_id !== currentSchedule.id) return false;
      const registeredAt = new Date(p.submitted_at ?? p.pagado_en);
      return registeredAt <= deadline;
    });

    if (currentPaid) {
      streak += 1;
      record = Math.max(record, streak);
      estado = 'activa';
    } else {
      const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursLeft <= HORAS_EN_RIESGO) {
        estado = 'en_riesgo';
        horasRestantes = Math.max(0, Math.floor(hoursLeft));
      } else {
        // Still time to pay; check if past streak is already broken
        const lastPast = pastSchedules.at(-1);
        estado = lastPast && !paidOnTimeSet.has(lastPast.id) ? 'rota' : 'activa';
      }
    }
  } else {
    // Between periods or junta ended
    const lastPast = pastSchedules.at(-1);
    if (lastPast) {
      estado = paidOnTimeSet.has(lastPast.id) ? 'activa' : 'rota';
    } else {
      estado = 'activa';
    }
  }

  return {
    semanasActual: streak,
    recordPersonal: record,
    proximoHito: getProximoHito(streak),
    estado,
    horasRestantes,
  };
}

export function computeGlobalRacha(params: {
  userId: string;
  payments: Payment[];
  schedules: PaymentSchedule[];
  juntaIds: string[];
  now?: Date;
}): RachaResult | null {
  const { juntaIds } = params;
  if (juntaIds.length === 0) return null;

  const results = juntaIds.map((juntaId) => computeJuntaRacha({ ...params, juntaId }));

  // Show most urgent: en_riesgo (least hours first), then best active streak, then rota by record
  const enRiesgo = results.filter((r) => r.estado === 'en_riesgo');
  if (enRiesgo.length > 0) {
    return enRiesgo.sort((a, b) => (a.horasRestantes ?? 0) - (b.horasRestantes ?? 0))[0];
  }

  const activa = results.filter((r) => r.estado === 'activa' && r.semanasActual > 0);
  if (activa.length > 0) {
    return activa.sort((a, b) => b.semanasActual - a.semanasActual)[0];
  }

  const rota = results.filter((r) => r.estado === 'rota');
  if (rota.length > 0) {
    return rota.sort((a, b) => b.recordPersonal - a.recordPersonal)[0];
  }

  return null;
}
