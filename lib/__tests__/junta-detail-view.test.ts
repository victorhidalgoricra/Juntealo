import { describe, expect, it } from 'vitest';
import { getCurrentWeekPaymentRows, getCurrentWeekSummary } from '@/lib/junta-detail-view';
import { Junta, JuntaMember, Payment, PaymentSchedule } from '@/types/domain';

const junta = { id: 'j1', admin_id: 'owner', cuota_base: 100, monto_cuota: 100 } as Junta;
const members = [
  { id: 'm1', junta_id: 'j1', profile_id: 'receiver', orden_turno: 1 },
  { id: 'm2', junta_id: 'j1', profile_id: 'payer', orden_turno: 2 },
] as JuntaMember[];
const schedule = { id: 's1', junta_id: 'j1', cuota_numero: 1, fecha_vencimiento: '2026-09-13', estado: 'pendiente' } as PaymentSchedule;

function payment(estado: Payment['estado'], paymentStatus?: Payment['payment_status']): Payment {
  return { id: 'p1', junta_id: 'j1', schedule_id: 's1', profile_id: 'payer', monto: 100, estado, payment_status: paymentStatus, pagado_en: '2026-09-13' };
}

describe('junta detail payment status', () => {
  it('uses payment_status before the legacy estado field', () => {
    const rows = getCurrentWeekPaymentRows({ junta, members, payments: [payment('approved', 'rejected')], currentWeek: 1, currentSchedule: schedule, receiverProfileId: 'receiver', juntaActiva: true });
    expect(rows.find((row) => row.profileId === 'payer')?.status).toBe('Rechazado');
  });

  it('counts confirmed and validating payments separately', () => {
    const validatingPayment = payment('submitted', 'validating');
    const summary = getCurrentWeekSummary({ junta, members, payments: [validatingPayment], schedules: [schedule], currentWeek: 1, juntaActiva: true });
    expect(summary).toMatchObject({ paid: 0, validating: 1, pending: 0 });
  });
});
