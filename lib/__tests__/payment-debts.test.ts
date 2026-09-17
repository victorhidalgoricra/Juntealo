import { describe, expect, it } from 'vitest';
import { buildPaymentDebtItems } from '@/lib/payment-debts';
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
