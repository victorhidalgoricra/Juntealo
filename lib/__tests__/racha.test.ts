import { describe, it, expect } from 'vitest';
import { computeJuntaRacha, computeGlobalRacha, getProximoHito } from '../racha';

type Schedule = {
  id: string;
  junta_id: string;
  cuota_numero: number;
  fecha_vencimiento: string;
  estado: string;
  monto: number;
};

type Payment = {
  id: string;
  junta_id: string;
  profile_id: string;
  schedule_id: string;
  estado: string;
  submitted_at: string;
  pagado_en: string;
};

function makeSchedule(juntaId: string, num: number, dueDate: string): Schedule {
  return {
    id: `schedule-${num}`,
    junta_id: juntaId,
    cuota_numero: num,
    fecha_vencimiento: dueDate,
    estado: 'pendiente',
    monto: 100
  };
}

function makePayment(juntaId: string, scheduleId: string, paidAt: string): Payment {
  return {
    id: `pay-${scheduleId}`,
    junta_id: juntaId,
    profile_id: 'user1',
    schedule_id: scheduleId,
    estado: 'approved',
    submitted_at: paidAt,
    pagado_en: paidAt
  };
}

const JUNTA_ID = 'junta1';

describe('getProximoHito', () => {
  it('next milestone from 0 is 4', () => expect(getProximoHito(0)).toBe(4));
  it('next milestone from 3 is 4', () => expect(getProximoHito(3)).toBe(4));
  it('next milestone from 4 is 8', () => expect(getProximoHito(4)).toBe(8));
  it('next milestone from 7 is 8', () => expect(getProximoHito(7)).toBe(8));
  it('next milestone from 8 is 12', () => expect(getProximoHito(8)).toBe(12));
  it('next milestone from 15 is 12 (max target)', () => expect(getProximoHito(15)).toBe(12));
});

describe('computeJuntaRacha — basic scenarios', () => {
  it('returns 0 streak when no payments exist', () => {
    const schedules = [makeSchedule(JUNTA_ID, 1, '2024-01-07')];
    const now = new Date('2024-01-10');
    const result = computeJuntaRacha({
      juntaId: JUNTA_ID,
      userId: 'user1',
      payments: [],
      schedules: schedules as never,
      now
    });
    expect(result.semanasActual).toBe(0);
  });

  it('counts single on-time payment as 1 streak week', () => {
    const schedules = [makeSchedule(JUNTA_ID, 1, '2024-01-07')];
    const payments = [makePayment(JUNTA_ID, 'schedule-1', '2024-01-05')];
    const now = new Date('2024-01-10');
    const result = computeJuntaRacha({
      juntaId: JUNTA_ID,
      userId: 'user1',
      payments: payments as never,
      schedules: schedules as never,
      now
    });
    expect(result.semanasActual).toBe(1);
    expect(result.estado).toBe('activa');
  });

  it('counts 3 consecutive on-time payments as streak of 3', () => {
    const schedules = [
      makeSchedule(JUNTA_ID, 1, '2024-01-07'),
      makeSchedule(JUNTA_ID, 2, '2024-01-14'),
      makeSchedule(JUNTA_ID, 3, '2024-01-21')
    ];
    const payments = [
      makePayment(JUNTA_ID, 'schedule-1', '2024-01-06'),
      makePayment(JUNTA_ID, 'schedule-2', '2024-01-13'),
      makePayment(JUNTA_ID, 'schedule-3', '2024-01-20')
    ];
    const now = new Date('2024-01-25');
    const result = computeJuntaRacha({
      juntaId: JUNTA_ID,
      userId: 'user1',
      payments: payments as never,
      schedules: schedules as never,
      now
    });
    expect(result.semanasActual).toBe(3);
  });

  it('streak breaks when a past payment is missing', () => {
    const schedules = [
      makeSchedule(JUNTA_ID, 1, '2024-01-07'),
      makeSchedule(JUNTA_ID, 2, '2024-01-14'),
      makeSchedule(JUNTA_ID, 3, '2024-01-21')
    ];
    // Only paid rounds 1 and 3 — round 2 is missing (late/skipped)
    const payments = [
      makePayment(JUNTA_ID, 'schedule-1', '2024-01-06'),
      makePayment(JUNTA_ID, 'schedule-3', '2024-01-20')
    ];
    const now = new Date('2024-01-25');
    const result = computeJuntaRacha({
      juntaId: JUNTA_ID,
      userId: 'user1',
      payments: payments as never,
      schedules: schedules as never,
      now
    });
    // Latest consecutive backward: round 3 is on time but round 2 is missing → streak = 1
    expect(result.semanasActual).toBe(1);
    expect(result.recordPersonal).toBe(1);
  });

  it('marks estado as en_riesgo when deadline is within 48 hours and not paid', () => {
    const now = new Date('2024-01-07T06:00:00');
    const deadline = new Date('2024-01-08T00:00:00'); // ~18 hours from now
    const schedules = [makeSchedule(JUNTA_ID, 1, deadline.toISOString())];
    const result = computeJuntaRacha({
      juntaId: JUNTA_ID,
      userId: 'user1',
      payments: [],
      schedules: schedules as never,
      now
    });
    expect(result.estado).toBe('en_riesgo');
    expect(result.horasRestantes).toBeLessThanOrEqual(48);
  });

  it('marks estado as rota when last past period was missed', () => {
    const schedules = [
      makeSchedule(JUNTA_ID, 1, '2024-01-07'), // past, not paid
      makeSchedule(JUNTA_ID, 2, '2024-01-14')  // current, not yet due
    ];
    const now = new Date('2024-01-10');
    const result = computeJuntaRacha({
      juntaId: JUNTA_ID,
      userId: 'user1',
      payments: [],
      schedules: schedules as never,
      now
    });
    expect(result.estado).toBe('rota');
  });

  it('recordPersonal tracks highest streak regardless of current', () => {
    const schedules = [
      makeSchedule(JUNTA_ID, 1, '2024-01-07'),
      makeSchedule(JUNTA_ID, 2, '2024-01-14'),
      makeSchedule(JUNTA_ID, 3, '2024-01-21'),
      makeSchedule(JUNTA_ID, 4, '2024-01-28')
    ];
    // Paid 1+2, missed 3, paid 4
    const payments = [
      makePayment(JUNTA_ID, 'schedule-1', '2024-01-06'),
      makePayment(JUNTA_ID, 'schedule-2', '2024-01-13'),
      makePayment(JUNTA_ID, 'schedule-4', '2024-01-27')
    ];
    const now = new Date('2024-02-01');
    const result = computeJuntaRacha({
      juntaId: JUNTA_ID,
      userId: 'user1',
      payments: payments as never,
      schedules: schedules as never,
      now
    });
    expect(result.recordPersonal).toBe(2); // best was rounds 1+2
    expect(result.semanasActual).toBe(1);  // only round 4 currently consecutive
  });
});

describe('computeGlobalRacha', () => {
  it('returns null when no juntas', () => {
    const result = computeGlobalRacha({
      userId: 'user1',
      payments: [],
      schedules: [],
      juntaIds: [],
      now: new Date()
    });
    expect(result).toBeNull();
  });

  it('returns the best active streak across juntas', () => {
    const junta2 = 'junta2';
    const schedules1 = [makeSchedule(JUNTA_ID, 1, '2024-01-07')];
    const schedules2 = [
      makeSchedule(junta2, 1, '2024-01-07'),
      makeSchedule(junta2, 2, '2024-01-14')
    ];
    const payments1 = [makePayment(JUNTA_ID, 'schedule-1', '2024-01-06')];
    const payments2 = [
      makePayment(junta2, 'schedule-1', '2024-01-06'),
      makePayment(junta2, 'schedule-2', '2024-01-13')
    ];
    const now = new Date('2024-01-20');

    const result = computeGlobalRacha({
      userId: 'user1',
      payments: [...payments1, ...payments2] as never,
      schedules: [...schedules1, ...schedules2] as never,
      juntaIds: [JUNTA_ID, junta2],
      now
    });

    expect(result?.semanasActual).toBe(2); // junta2 has streak of 2
  });

  it('prioritizes en_riesgo over active streaks', () => {
    const junta2 = 'junta2';
    const now = new Date('2024-01-07T10:00:00');
    // junta2 has an upcoming payment within 48h and streak of 0
    const schedules2 = [makeSchedule(junta2, 1, '2024-01-08T00:00:00')]; // 14h away
    const schedules1 = [
      makeSchedule(JUNTA_ID, 1, '2024-01-01'),
      makeSchedule(JUNTA_ID, 2, '2024-01-07')
    ];
    const payments1 = [
      makePayment(JUNTA_ID, 'schedule-1', '2024-01-01'),
      makePayment(JUNTA_ID, 'schedule-2', '2024-01-07')
    ];

    const result = computeGlobalRacha({
      userId: 'user1',
      payments: payments1 as never,
      schedules: [...schedules1, ...schedules2] as never,
      juntaIds: [JUNTA_ID, junta2],
      now
    });

    expect(result?.estado).toBe('en_riesgo');
  });
});
