import { describe, expect, it } from 'vitest';
import { computeRanking } from '../ranking.service';
import { Junta, JuntaMember, PublicProfile } from '@/types/domain';

function profile(id: string, nombre: string, created_at: string): PublicProfile {
  return { id, nombre, created_at };
}

function closedJunta(id: string, profileId: string): Junta {
  return {
    id,
    admin_id: profileId,
    slug: id,
    invite_token: id,
    nombre: id,
    moneda: 'PEN',
    participantes_max: 2,
    monto_cuota: 100,
    premio_primero_pct: 0,
    descuento_ultimo_pct: 0,
    fee_plataforma_pct: 0,
    frecuencia_pago: 'mensual',
    fecha_inicio: '2026-01-01',
    dia_limite_pago: 1,
    visibilidad: 'privada',
    cerrar_inscripciones: false,
    estado: 'cerrada',
    created_at: '2026-01-01T00:00:00.000Z',
  };
}

function member(juntaId: string, profileId: string): JuntaMember {
  return {
    id: `${juntaId}-${profileId}`,
    junta_id: juntaId,
    profile_id: profileId,
    estado: 'activo',
    orden_turno: 1,
  };
}

function closedJuntasFor(profileId: string, count: number) {
  const juntas = Array.from({ length: count }, (_, index) => closedJunta(`${profileId}-${index}`, profileId));
  return {
    juntas,
    members: juntas.map((junta) => member(junta.id, profileId)),
  };
}

describe('computeRanking', () => {
  it('orders tied zero-score profiles by oldest profile creation date first', () => {
    const ranking = computeRanking({
      currentUserId: 'new',
      juntas: [],
      members: [],
      schedules: [],
      payments: [],
      profilesById: {
        new: profile('new', 'Grace García', '2026-03-01T00:00:00.000Z'),
        old: profile('old', 'Victor Hidalgo', '2026-01-01T00:00:00.000Z'),
        middle: profile('middle', 'Martha Zapata', '2026-02-01T00:00:00.000Z'),
      },
    });

    expect(ranking.map((entry) => entry.profileId)).toEqual(['old', 'middle', 'new']);
  });

  it('uses profile_created_at as the ranking age tie-breaker when provided by the RPC', () => {
    const ranking = computeRanking({
      currentUserId: 'new',
      juntas: [],
      members: [],
      schedules: [],
      payments: [],
      profilesById: {
        new: { id: 'new', nombre: 'Grace García', profile_created_at: '2026-03-01T00:00:00.000Z' },
        old: { id: 'old', nombre: 'Victor Hidalgo', profile_created_at: '2026-01-01T00:00:00.000Z' },
      },
    });

    expect(ranking.map((entry) => entry.profileId)).toEqual(['old', 'new']);
  });

  it('orders tied scores by completed cycles descending', () => {
    const manyCycles = closedJuntasFor('many', 7);
    const fewerCycles = closedJuntasFor('fewer', 6);

    const ranking = computeRanking({
      currentUserId: 'many',
      juntas: [...fewerCycles.juntas, ...manyCycles.juntas],
      members: [...fewerCycles.members, ...manyCycles.members],
      schedules: [],
      payments: [],
      profilesById: {
        fewer: profile('fewer', 'Grace García', '2026-01-01T00:00:00.000Z'),
        many: profile('many', 'Martha Zapata', '2026-02-01T00:00:00.000Z'),
      },
    });

    expect(ranking.map((entry) => [entry.profileId, entry.score, entry.juntasCompletadas])).toEqual([
      ['many', 20, 7],
      ['fewer', 20, 6],
    ]);
  });

  it('keeps a higher score above lower scores regardless of profile age', () => {
    const highScore = closedJuntasFor('high', 1);

    const ranking = computeRanking({
      currentUserId: 'low',
      juntas: highScore.juntas,
      members: highScore.members,
      schedules: [],
      payments: [],
      profilesById: {
        low: profile('low', 'Victor Hidalgo', '2026-01-01T00:00:00.000Z'),
        high: profile('high', 'Grace García', '2026-02-01T00:00:00.000Z'),
      },
    });

    expect(ranking[0].profileId).toBe('high');
    expect(ranking[0].score).toBeGreaterThan(ranking[1].score);
  });

  it('keeps first name plus last-name initial display format and current-user flag', () => {
    const ranking = computeRanking({
      currentUserId: 'victor',
      juntas: [],
      members: [],
      schedules: [],
      payments: [],
      profilesById: {
        victor: {
          id: 'victor',
          nombre: 'Victor Manuel Hidalgo',
          first_name: 'Victor',
          paternal_last_name: 'Hidalgo',
          created_at: '2026-01-01T00:00:00.000Z',
        },
      },
    });

    expect(ranking[0].displayName).toBe('Victor H.');
    expect(ranking[0].isCurrentUser).toBe(true);
  });
});
