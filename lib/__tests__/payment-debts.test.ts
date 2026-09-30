import { describe, expect, it } from 'vitest';
import { buildPaymentDebtItems, getNextPaymentHref, selectCurrentPaymentNoticeItems } from '@/lib/payment-debts';
import type { Junta, JuntaMember, PaymentSchedule } from '@/types/domain';

const userId = 'profile-1';

function junta(overrides: Partial<Junta> = {}): Junta {
  return {
    id: 'junta-1',
    admin_id: 'admin-1',
    slug: 'junta-1',
    invite_token: 'token',
    nombre: 'Junta de prueba',
    moneda: 'PEN',
    participantes_max: 2,
    monto_cuota: 100,
    premio_primero_pct: 0,
    descuento_ultimo_pct: 0,
    fee_plataforma_pct: 0,
    frecuencia_pago: 'semanal',
    fecha_inicio: '2026-09-01',
    dia_limite_pago: 1,
    visibilidad: 'privada',
    cerrar_inscripciones: true,
    estado: 'activa',
    created_at: '2026-09-01T00:00:00Z',
    ...overrides,
  };
}

const member: JuntaMember = {
  id: 'member-1',
  junta_id: 'junta-1',
  profile_id: userId,
  rol: 'participante',
  estado: 'activo',
  orden_turno: 2,
};

const schedule: PaymentSchedule = {
  id: 'schedule-1',
  junta_id: 'junta-1',
  cuota_numero: 1,
  fecha_vencimiento: '2026-09-20',
  monto: 100,
  estado: 'pendiente',
};

function debts(juntaRecord: Junta) {
  return buildPaymentDebtItems({
    userId,
    juntas: [juntaRecord],
    members: [member],
    schedules: [schedule],
    payments: [],
    profilesById: {},
    now: new Date('2026-09-16T12:00:00Z'),
  });
}

describe('buildPaymentDebtItems', () => {
  it('does not surface payments from a blocked junta', () => {
    expect(debts(junta({ bloqueada: true }))).toEqual([]);
  });

  it('does not surface payments from a soft-deleted junta', () => {
    expect(debts(junta({ deleted_at: '2026-09-16T00:00:00Z' }))).toEqual([]);
  });

  it('keeps payments from an active junta', () => {
    expect(debts(junta())).toHaveLength(1);
  });
});

describe('selectCurrentPaymentNoticeItems', () => {
  it('keeps the receiver round instead of exposing the next round as payable', () => {
    const items = [
      {
        id: 'junta-1:schedule-1', juntaId: 'junta-1', juntaNombre: 'Junta de prueba',
        cuotaId: 'schedule-1', cuotaNumero: 1, dueDate: '2026-09-20', monto: 100,
        receiverName: 'Yo', receiverId: userId, receiverMethod: 'Yape',
        receiverMethodConfigured: true, myPayoutConfigured: true,
        isMyReceivingTurn: true, status: 'pendiente' as const,
      },
      {
        id: 'junta-1:schedule-2', juntaId: 'junta-1', juntaNombre: 'Junta de prueba',
        cuotaId: 'schedule-2', cuotaNumero: 2, dueDate: '2026-09-27', monto: 100,
        receiverName: 'Otra persona', receiverId: 'profile-2', receiverMethod: 'Yape',
        receiverMethodConfigured: true, myPayoutConfigured: true,
        isMyReceivingTurn: false, status: 'pendiente' as const,
      },
    ];

    expect(selectCurrentPaymentNoticeItems(items)).toEqual([items[0]]);
  });

  it('does not advance to a future round when the current payment is already approved', () => {
    const current = {
      id: 'junta-1:schedule-1', juntaId: 'junta-1', juntaNombre: 'Junta de prueba',
      cuotaId: 'schedule-1', cuotaNumero: 1, dueDate: '2026-09-20', monto: 100,
      receiverName: 'Otra persona', receiverId: 'profile-2', receiverMethod: 'Yape',
      receiverMethodConfigured: true, myPayoutConfigured: true,
      isMyReceivingTurn: false, status: 'pagada' as const,
    };
    const future = { ...current, id: 'junta-1:schedule-2', cuotaId: 'schedule-2', cuotaNumero: 2, dueDate: '2026-09-27', status: 'pendiente' as const };

    expect(selectCurrentPaymentNoticeItems([current, future])).toEqual([]);
  });
});

describe('getNextPaymentHref', () => {
  const base = { ...debts(junta())[0], isMyReceivingTurn: false };

  it('opens the earliest unpaid junta, including overdue payments', () => {
    const later = { ...base, juntaId: 'later', dueDate: '2026-09-25' };
    const overdue = { ...base, juntaId: 'overdue', dueDate: '2026-09-10', status: 'vencida' as const };
    expect(getNextPaymentHref([later, base, overdue])).toBe('/juntas/overdue?tab=pagos');
  });

  it('skips paid, validating and receiving rounds without advancing them', () => {
    const excluded = [
      { ...base, juntaId: 'paid', status: 'pagada' as const },
      { ...base, juntaId: 'validating', status: 'en_validacion' as const },
      { ...base, juntaId: 'receiving', isMyReceivingTurn: true },
    ];
    const future = excluded.map((item) => ({ ...item, cuotaNumero: 2, status: 'pendiente' as const, isMyReceivingTurn: false }));
    expect(getNextPaymentHref([...excluded, ...future, { ...base, juntaId: 'payable', dueDate: '2026-09-25' }])).toBe('/juntas/payable?tab=pagos');
    expect(getNextPaymentHref([...excluded, ...future])).toBe('/juntas');
  });

  it('falls back to juntas when there are no debts', () => {
    expect(getNextPaymentHref([])).toBe('/juntas');
  });
});
