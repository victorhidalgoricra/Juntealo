import { describe, expect, it } from 'vitest';
import { getCurrentWeekPaymentRows, getCurrentWeekSummary, getUserPersonalJuntaView, WeeklyMemberRow } from '@/lib/junta-detail-view';
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
  it('does not count the receiver as pending while the junta is still forming', () => {
    const summary = getCurrentWeekSummary({ junta, members, payments: [], schedules: [schedule], currentWeek: 1, juntaActiva: false });

    expect(summary.rows.find((row) => row.profileId === 'receiver')?.status).toBe('Recibe');
    expect(summary).toMatchObject({ paid: 0, validating: 0, pending: 1 });
  });

  it('uses payment_status before the legacy estado field', () => {
    const rows = getCurrentWeekPaymentRows({ junta, members, payments: [payment('approved', 'rejected')], currentWeek: 1, currentSchedule: schedule, receiverProfileId: 'receiver', juntaActiva: true });
    expect(rows.find((row) => row.profileId === 'payer')?.status).toBe('Rechazado');
  });

  it('counts confirmed and validating payments separately', () => {
    const validatingPayment = payment('submitted', 'validating');
    const summary = getCurrentWeekSummary({ junta, members, payments: [validatingPayment], schedules: [schedule], currentWeek: 1, juntaActiva: true });
    expect(summary).toMatchObject({ paid: 0, validating: 1, pending: 0 });
  });

  it('excludes the receiver from the personal payment progress total', () => {
    const weeklyRows = [
      { profileId: 'receiver', isReceiver: true, status: 'Recibe' },
      { profileId: 'payer-1', isReceiver: false, status: 'Pendiente' },
      { profileId: 'payer-2', isReceiver: false, status: 'Pendiente' },
      { profileId: 'payer-3', isReceiver: false, status: 'Pendiente' },
    ] as WeeklyMemberRow[];

    const personal = getUserPersonalJuntaView({
      junta,
      currentWeek: 1,
      weeklyRows,
      myTurn: null,
      simulationRows: [],
    });

    expect(personal.progressLabel).toBe('0/3 ya pagaron');
  });
});
