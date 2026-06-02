import { describe, it, expect } from 'vitest';
import { getPaymentAlertState } from '../payment-alert';
import type { Junta, JuntaMember, Payment, PaymentSchedule, Payout } from '@/types/domain';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeJunta(id: string): Junta {
  return {
    id,
    admin_id: 'admin-1',
    nombre: `Junta ${id}`,
    slug: id,
    invite_token: `token-${id}`,
    moneda: 'PEN',
    participantes_max: 4,
    monto_cuota: 20,
    premio_primero_pct: 0,
    descuento_ultimo_pct: 0,
    fee_plataforma_pct: 0,
    frecuencia_pago: 'semanal',
    fecha_inicio: '2026-01-01',
    dia_limite_pago: 7,
    visibilidad: 'privada',
    cerrar_inscripciones: false,
    estado: 'activa',
    created_at: '2026-01-01T00:00:00Z',
  };
}

function makeMember(juntaId: string, profileId: string, ordenTurno: number): JuntaMember {
  return {
    id: `member-${profileId}`,
    junta_id: juntaId,
    profile_id: profileId,
    estado: 'activo',
    orden_turno: ordenTurno,
  };
}

function makeSchedule(juntaId: string, cuotaNumero: number, fechaVencimiento: string, estado: 'pendiente' | 'vencida' = 'vencida'): PaymentSchedule {
  return {
    id: `sched-${juntaId}-${cuotaNumero}`,
    junta_id: juntaId,
    cuota_numero: cuotaNumero,
    fecha_vencimiento: fechaVencimiento,
    monto: 20,
    estado,
  };
}

function makePayout(juntaId: string, profileId: string, rondaNumero: number, entregadoEn: string): Payout {
  return {
    id: `payout-${juntaId}-${rondaNumero}`,
    junta_id: juntaId,
    profile_id: profileId,
    ronda_numero: rondaNumero,
    monto_pozo: 80,
    entregado_en: entregadoEn,
  };
}

const PAST = '2026-05-01T00:00:00Z'; // before now
const FUTURE = '2026-12-31T23:59:59Z'; // after now
const NOW = new Date('2026-05-27T12:00:00Z');

// ── Tests ────────────────────────────────────────────────────────────────────

describe('getPaymentAlertState — receptor exclusion', () => {
  const JUNTA_ID = 'j1';
  const USER_A = 'user-a'; // orden_turno=1, receiver of cuota 1
  const USER_B = 'user-b'; // orden_turno=2, not receiver of cuota 1

  const junta = makeJunta(JUNTA_ID);
  const memberA = makeMember(JUNTA_ID, USER_A, 1);
  const memberB = makeMember(JUNTA_ID, USER_B, 2);
  const members = [memberA, memberB];

  // Cuota 1 is overdue (past due date), no payout delivered yet → currentCuota=1
  const overdueSchedule = makeSchedule(JUNTA_ID, 1, PAST, 'vencida');

  it('receptor actual NO ve alerta de pago vencido para su propio turno', () => {
    const result = getPaymentAlertState({
      userId: USER_A, // USER_A is the receiver of cuota 1
      myJuntaIds: [JUNTA_ID],
      juntas: [junta],
      schedules: [overdueSchedule],
      payments: [],
      payouts: [],
      members,
      now: NOW,
    });

    expect(result.status).toBe('none');
  });

  it('no receptor con pago vencido SÍ ve alerta', () => {
    const result = getPaymentAlertState({
      userId: USER_B, // USER_B is not receiver, so they owe payment
      myJuntaIds: [JUNTA_ID],
      juntas: [junta],
      schedules: [overdueSchedule],
      payments: [],
      payouts: [],
      members,
      now: NOW,
    });

    expect(result.status).toBe('overdue');
    expect(result.tone).toBe('destructive');
    expect(result.amount).toBe(20);
  });

  it('receptor anterior con deuda posterior SÍ ve alerta para cuotas futuras', () => {
    // USER_A received payout for ronda 1 (delivered), now cuota 2 is pending for everyone
    const deliveredPayout = makePayout(JUNTA_ID, USER_A, 1, '2026-05-10T00:00:00Z');
    // cuota 2: USER_B is receiver (orden_turno=2, roundIndex=(2-1)%2=1 → memberB)
    const cuota2Schedule = makeSchedule(JUNTA_ID, 2, PAST, 'vencida');

    const result = getPaymentAlertState({
      userId: USER_A,
      myJuntaIds: [JUNTA_ID],
      juntas: [junta],
      schedules: [cuota2Schedule],
      payments: [],
      payouts: [deliveredPayout],
      members,
      now: NOW,
    });

    // USER_A is NOT receiver of cuota 2 (USER_B is), so they owe payment
    expect(result.status).toBe('overdue');
    expect(result.amount).toBe(20);
  });

  it('sin members, el receptor aún ve alerta (backward compat)', () => {
    // Without members data, we can't exclude the receiver → old behavior preserved
    const result = getPaymentAlertState({
      userId: USER_A,
      myJuntaIds: [JUNTA_ID],
      juntas: [junta],
      schedules: [overdueSchedule],
      payments: [],
      payouts: [],
      // members: omitted
      now: NOW,
    });

    expect(result.status).toBe('overdue');
  });

  it('junta activa con pagos pendientes de otros: receptor ve status none', () => {
    // Only overdue schedule is cuota 1 where USER_A is receiver → excluded
    const result = getPaymentAlertState({
      userId: USER_A,
      myJuntaIds: [JUNTA_ID],
      juntas: [junta],
      schedules: [overdueSchedule],
      payments: [],
      payouts: [],
      members,
      now: NOW,
    });

    // No pending alert for the receiver themselves
    expect(result.status).toBe('none');
    expect(result.title).toBe('');
  });

  it('receptor con múltiples juntas: excluye solo el turno propio, muestra deuda en otra junta', () => {
    const JUNTA_2 = 'j2';
    const junta2 = makeJunta(JUNTA_2);
    // In junta2, USER_A is NOT receiver (only USER_B is member #1 there)
    const memberB_j2 = makeMember(JUNTA_2, USER_B, 1);
    const memberA_j2 = makeMember(JUNTA_2, USER_A, 2);
    const overdueScheduleJ2 = makeSchedule(JUNTA_2, 1, PAST, 'vencida');

    const result = getPaymentAlertState({
      userId: USER_A,
      myJuntaIds: [JUNTA_ID, JUNTA_2],
      juntas: [junta, junta2],
      // cuota 1 j1 (USER_A is receiver → excluded) + cuota 1 j2 (USER_B is receiver, USER_A owes)
      schedules: [overdueSchedule, overdueScheduleJ2],
      payments: [],
      payouts: [],
      members: [memberA, memberB, memberA_j2, memberB_j2],
      now: NOW,
    });

    // j1 cuota 1 excluded (USER_A is receiver), j2 cuota 1 shown (USER_A owes)
    expect(result.status).toBe('overdue');
    expect(result.juntaId).toBe(JUNTA_2);
  });

  it('pago en validación del receptor excluido: status none', () => {
    const payment: Payment = {
      id: 'pay-1',
      junta_id: JUNTA_ID,
      schedule_id: overdueSchedule.id,
      profile_id: USER_B,
      monto: 20,
      estado: 'submitted',
      payment_status: 'submitted',
      pagado_en: '',
    };

    // USER_B submitted payment for cuota 1 (which USER_A receives)
    // USER_A (receiver) should still see no alert
    const result = getPaymentAlertState({
      userId: USER_A,
      myJuntaIds: [JUNTA_ID],
      juntas: [junta],
      schedules: [overdueSchedule],
      payments: [payment],
      payouts: [],
      members,
      now: NOW,
    });

    expect(result.status).toBe('none');
  });
});

describe('getPaymentAlertState — casos estándar sin receptor', () => {
  const JUNTA_ID = 'j-std';
  const USER = 'user-std';
  const junta = makeJunta(JUNTA_ID);

  it('cuota vencida sin pago → overdue', () => {
    const schedule = makeSchedule(JUNTA_ID, 1, PAST, 'vencida');
    const result = getPaymentAlertState({
      userId: USER,
      myJuntaIds: [JUNTA_ID],
      juntas: [junta],
      schedules: [schedule],
      payments: [],
      payouts: [],
      now: NOW,
    });
    expect(result.status).toBe('overdue');
    expect(result.tone).toBe('destructive');
  });

  it('cuota futura pendiente → upcoming', () => {
    const schedule = makeSchedule(JUNTA_ID, 1, FUTURE, 'pendiente');
    const result = getPaymentAlertState({
      userId: USER,
      myJuntaIds: [JUNTA_ID],
      juntas: [junta],
      schedules: [schedule],
      payments: [],
      payouts: [],
      now: NOW,
    });
    expect(result.status).toBe('upcoming');
  });

  it('cuota con pago aprobado → none/paid', () => {
    const schedule = makeSchedule(JUNTA_ID, 1, PAST, 'vencida');
    const payment: Payment = {
      id: 'pay-approved',
      junta_id: JUNTA_ID,
      schedule_id: schedule.id,
      profile_id: USER,
      monto: 20,
      estado: 'approved',
      payment_status: 'approved',
      pagado_en: '2026-05-01T10:00:00Z',
    };
    const result = getPaymentAlertState({
      userId: USER,
      myJuntaIds: [JUNTA_ID],
      juntas: [junta],
      schedules: [schedule],
      payments: [payment],
      payouts: [],
      now: NOW,
    });
    expect(['none', 'paid']).toContain(result.status);
  });
});
