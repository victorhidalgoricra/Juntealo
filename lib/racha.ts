import type { JuntaMember, Payment, PaymentSchedule } from '@/types/domain';
import { getCurrentRoundReceiver } from '@/lib/payment-instructions';
import { normalizePaymentStatus } from '@/lib/payment-status';

export type EstadoRacha = 'activa' | 'en_riesgo' | 'rota' | 'en_revision';
export type RachaResult = {
  juntaId: string;
  /** Legacy field name: the unit is consecutive installments, not weeks. */
  semanasActual: number;
  recordPersonal: number;
  proximoHito: number;
  estado: EstadoRacha;
  horasRestantes?: number;
  cuotaInterrumpida?: number;
  fechaInterrupcion?: string;
  pendientesRevision: number;
  tieneDeuda: boolean;
};

/** Date-only deadlines include the entire due day in Peru. */
export function rachaDeadline(value: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999-05:00` : value);
}
export function getProximoHito(cuotas: number): number {
  return cuotas < 4 ? 4 : cuotas < 8 ? 8 : 12;
}

export function computeJuntaRacha(params: {
  juntaId: string; userId: string; payments: Payment[]; schedules: PaymentSchedule[];
  members?: JuntaMember[]; now?: Date;
}): RachaResult {
  const { juntaId, userId } = params;
  const now = params.now ?? new Date();
  const schedules = params.schedules.filter(s => s.junta_id === juntaId &&
    getCurrentRoundReceiver({ schedule: s, members: (params.members ?? []).filter(m => m.junta_id === juntaId) })?.profile_id !== userId
  ).sort((a, b) => a.cuota_numero - b.cuota_numero);
  let streak = 0, record = 0, pending = 0;
  let broken: PaymentSchedule | undefined;
  let debt = false;
  let next: PaymentSchedule | undefined;
  let blocked = false;
  for (const schedule of schedules) {
    const deadline = rachaDeadline(schedule.fecha_vencimiento);
    const payments = params.payments.filter(p => p.junta_id === juntaId && p.profile_id === userId && p.schedule_id === schedule.id);
    const onTime = (p: Payment) => new Date(p.submitted_at ?? p.pagado_en) <= deadline;
    const approved = payments.some(p => normalizePaymentStatus(p.payment_status ?? p.estado) === 'approved' && onTime(p));
    const review = payments.some(p => ['submitted', 'validating'].includes(normalizePaymentStatus(p.payment_status ?? p.estado)) && onTime(p));
    if (approved) {
      // An unresolved earlier installment cannot earn confirmed points or milestones.
      if (!blocked) { streak++; record = Math.max(record, streak); broken = undefined; }
    } else if (review) {
      pending++; blocked = true;
    } else if (deadline < now) {
      streak = 0; pending = 0; blocked = false; broken = schedule;
      if (!payments.some(p => normalizePaymentStatus(p.payment_status ?? p.estado) === 'approved')) debt = true;
    } else {
      next ??= schedule;
      blocked = true;
    }
  }
  const hours = next ? Math.max(0, Math.ceil((rachaDeadline(next.fecha_vencimiento).getTime() - now.getTime()) / 3600000)) : undefined;
  const estado: EstadoRacha = pending ? 'en_revision' : broken ? 'rota' : hours !== undefined && hours <= 48 ? 'en_riesgo' : 'activa';
  return { juntaId, semanasActual: streak, recordPersonal: record, proximoHito: getProximoHito(streak), estado,
    horasRestantes: hours, cuotaInterrumpida: broken?.cuota_numero, fechaInterrupcion: broken?.fecha_vencimiento,
    pendientesRevision: pending, tieneDeuda: debt };
}

export function selectGlobalRacha(results: RachaResult[]): RachaResult | null {
  // Show the same best confirmed streak used by the score, with deterministic ties.
  return [...results].sort((a, b) => b.semanasActual - a.semanasActual || b.recordPersonal - a.recordPersonal || a.juntaId.localeCompare(b.juntaId))[0] ?? null;
}
export function computeGlobalRacha(params: {
  userId: string; payments: Payment[]; schedules: PaymentSchedule[]; members?: JuntaMember[]; juntaIds: string[]; now?: Date;
}): RachaResult | null {
  return selectGlobalRacha(params.juntaIds.map(juntaId => computeJuntaRacha({ ...params, juntaId })));
}
