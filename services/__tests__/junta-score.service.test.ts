import { describe, it, expect } from 'vitest';
import {
  getUserJuntaScore,
  buildJuntaScoreStatsFromDomain,
  getScoreLevel,
  getNextLevel,
  getPointsToNextLevel,
  JUNTA_SCORE_CONFIG,
  type JuntaScoreStats
} from '../junta-score.service';

const emptyStats: JuntaScoreStats = {
  onTimePaymentsThisWeek: 0,
  latePaymentsThisWeek: 0,
  onTimePaymentsRecent: 0,
  latePaymentsRecent: 0,
  defaultPaymentsRecent: 0,
  onTimePaymentsLifetime: 0,
  latePaymentsLifetime: 0,
  defaultPaymentsLifetime: 0,
  completedCycles: 0,
  activeStreakWeeks: 0,
  successfulReferrals: 0,
  validatedReferences: 0,
  healthyActions: 5,
  abandonedMidCycleCount: 0,
  suspiciousAbuseAttempts: 0
};

describe('getScoreLevel', () => {
  it('returns Nuevo for score 0', () => {
    expect(getScoreLevel(0)).toBe('Nuevo');
  });

  it('returns Bronce at lower boundary (30)', () => {
    expect(getScoreLevel(30)).toBe('Bronce');
  });

  it('returns Plata at lower boundary (50)', () => {
    expect(getScoreLevel(50)).toBe('Plata');
  });

  it('returns Oro at lower boundary (70)', () => {
    expect(getScoreLevel(70)).toBe('Oro');
  });

  it('returns Élite at lower boundary (85)', () => {
    expect(getScoreLevel(85)).toBe('Élite');
  });

  it('returns Élite at 100', () => {
    expect(getScoreLevel(100)).toBe('Élite');
  });

  it('clamps out-of-range values — negative becomes Nuevo', () => {
    expect(getScoreLevel(-5)).toBe('Nuevo');
  });

  it('clamps out-of-range values — above 100 becomes Élite', () => {
    expect(getScoreLevel(110)).toBe('Élite');
  });
});

describe('getNextLevel', () => {
  it('returns Bronce from Nuevo range', () => {
    expect(getNextLevel(20)).toBe('Bronce');
  });

  it('returns null from Élite (max level)', () => {
    expect(getNextLevel(95)).toBeNull();
  });
});

describe('getPointsToNextLevel', () => {
  it('returns points needed to reach Bronce from 20', () => {
    expect(getPointsToNextLevel(20)).toBe(10); // Bronce starts at 30
  });

  it('returns 0 at Élite level', () => {
    expect(getPointsToNextLevel(90)).toBe(0);
  });
});

describe('getUserJuntaScore', () => {
  it('new user with no activity stays at Nuevo level', () => {
    // emptyStats has healthyActions:5 which gives 5pts (the baseline "no bad behavior" bonus)
    const result = getUserJuntaScore('user1', emptyStats);
    expect(result.level).toBe('Nuevo');
    expect(result.score).toBeLessThan(30); // below Bronce floor
  });

  it('perfect punctuality reaches high score', () => {
    const stats: JuntaScoreStats = {
      ...emptyStats,
      onTimePaymentsRecent: 10,
      onTimePaymentsLifetime: 10,
      completedCycles: 3,
      activeStreakWeeks: 8
    };
    const result = getUserJuntaScore('user1', stats);
    expect(result.score).toBeGreaterThan(50);
    expect(['Plata', 'Oro', 'Élite']).toContain(result.level);
  });

  it('penalties from late payments reduce score', () => {
    const goodStats: JuntaScoreStats = {
      ...emptyStats,
      onTimePaymentsRecent: 10,
      onTimePaymentsLifetime: 10
    };
    const lateStats: JuntaScoreStats = {
      ...goodStats,
      latePaymentsRecent: 5,
      latePaymentsLifetime: 5
    };
    const goodScore = getUserJuntaScore('user1', goodStats);
    const lateScore = getUserJuntaScore('user1', lateStats);
    expect(lateScore.score).toBeLessThan(goodScore.score);
  });

  it('default payments carry heavier penalty than late', () => {
    const baseStats: JuntaScoreStats = {
      ...emptyStats,
      onTimePaymentsRecent: 5,
      onTimePaymentsLifetime: 5
    };
    const lateStats: JuntaScoreStats = {
      ...baseStats,
      latePaymentsRecent: 2
    };
    const defaultStats: JuntaScoreStats = {
      ...baseStats,
      defaultPaymentsRecent: 2
    };
    const lateScore = getUserJuntaScore('user1', lateStats);
    const defaultScore = getUserJuntaScore('user1', defaultStats);
    expect(defaultScore.score).toBeLessThan(lateScore.score);
  });

  it('adds mission bonus points directly to score', () => {
    const baseScore = getUserJuntaScore('user1', emptyStats, 0);
    const bonusScore = getUserJuntaScore('user1', emptyStats, 5);
    expect(bonusScore.score).toBe(Math.min(100, baseScore.score + 5));
  });

  it('mission bonus is reflected in breakdown', () => {
    const result = getUserJuntaScore('user1', emptyStats, 8);
    expect(result.breakdown.missionBonus).toBe(8);
  });

  it('mission bonus adds a reason message', () => {
    const result = getUserJuntaScore('user1', emptyStats, 3);
    expect(result.reasons.some((r) => r.includes('+3'))).toBe(true);
  });

  it('mission bonus cannot be negative', () => {
    const result = getUserJuntaScore('user1', emptyStats, -10);
    expect(result.breakdown.missionBonus).toBe(0);
  });

  it('score is clamped to 0–100', () => {
    const stats: JuntaScoreStats = {
      ...emptyStats,
      onTimePaymentsRecent: 100,
      onTimePaymentsLifetime: 100,
      completedCycles: 6,
      activeStreakWeeks: 12,
      successfulReferrals: 4,
      validatedReferences: 3,
      healthyActions: 5
    };
    const result = getUserJuntaScore('user1', stats, 50);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('referral cap prevents abuse — 4 referrals + 3 references = max', () => {
    const capHit: JuntaScoreStats = {
      ...emptyStats,
      successfulReferrals: 4,
      validatedReferences: 3
    };
    const overCap: JuntaScoreStats = {
      ...emptyStats,
      successfulReferrals: 100,
      validatedReferences: 100
    };
    const capScore = getUserJuntaScore('user1', capHit);
    const overScore = getUserJuntaScore('user1', overCap);
    expect(capScore.breakdown.referrals).toBe(overScore.breakdown.referrals);
  });

  it('level upgrades when score crosses level boundary', () => {
    // emptyStats base score = 5 (from healthyActions:5). Use zeroed stats for boundary tests.
    const zeroStats: JuntaScoreStats = { ...emptyStats, healthyActions: 0 };
    const beforeBronce = getUserJuntaScore('user1', zeroStats, 28);
    const atBronce = getUserJuntaScore('user1', zeroStats, 30);
    expect(beforeBronce.level).toBe('Nuevo');
    expect(atBronce.level).toBe('Bronce');
  });

  it('abandoned mid-cycle reduces score', () => {
    const clean: JuntaScoreStats = { ...emptyStats };
    const abandoned: JuntaScoreStats = { ...emptyStats, abandonedMidCycleCount: 1 };
    const cleanScore = getUserJuntaScore('user1', clean);
    const abandonedScore = getUserJuntaScore('user1', abandoned);
    expect(abandonedScore.score).toBeLessThanOrEqual(cleanScore.score);
  });

  it('suspicious abuse carries the heaviest penalty', () => {
    const lateStats: JuntaScoreStats = { ...emptyStats, latePaymentsRecent: 1 };
    const abuseStats: JuntaScoreStats = { ...emptyStats, suspiciousAbuseAttempts: 1 };
    const lateScore = getUserJuntaScore('user1', lateStats);
    const abuseScore = getUserJuntaScore('user1', abuseStats);
    expect(abuseScore.score).toBeLessThanOrEqual(lateScore.score);
  });
});

describe('buildJuntaScoreStatsFromDomain', () => {
  it('returns zeroed stats for user with no data', () => {
    const result = buildJuntaScoreStatsFromDomain({
      userId: 'user1',
      juntas: [],
      members: [],
      payments: [],
      schedules: []
    });
    expect(result.onTimePaymentsRecent).toBe(0);
    expect(result.defaultPaymentsRecent).toBe(0);
    expect(result.completedCycles).toBe(0);
  });

  it('counts on-time payment when submitted before deadline', () => {
    const juntaId = 'junta1';
    const scheduleId = 'schedule1';
    const deadline = new Date('2024-01-10');
    const submittedAt = new Date('2024-01-08').toISOString();
    const now = new Date('2024-02-01');

    const result = buildJuntaScoreStatsFromDomain({
      userId: 'user1',
      juntas: [{ id: juntaId, admin_id: 'user1', estado: 'activa' } as never],
      members: [],
      payments: [
        {
          id: 'pay1',
          junta_id: juntaId,
          schedule_id: scheduleId,
          profile_id: 'user1',
          estado: 'approved',
          submitted_at: submittedAt,
          pagado_en: submittedAt
        } as never
      ],
      schedules: [
        {
          id: scheduleId,
          junta_id: juntaId,
          fecha_vencimiento: deadline.toISOString(),
          estado: 'pagada',
          cuota_numero: 1
        } as never
      ],
      now
    });

    expect(result.onTimePaymentsLifetime).toBe(1);
    expect(result.latePaymentsLifetime).toBe(0);
  });

  it('counts completed cycles (juntas in cerrada state)', () => {
    const result = buildJuntaScoreStatsFromDomain({
      userId: 'user1',
      juntas: [
        { id: 'j1', admin_id: 'user1', estado: 'cerrada' } as never,
        { id: 'j2', admin_id: 'user1', estado: 'activa' } as never
      ],
      members: [],
      payments: [],
      schedules: []
    });
    expect(result.completedCycles).toBe(1);
  });

  it('counts abandoned mid-cycle for retired members', () => {
    const result = buildJuntaScoreStatsFromDomain({
      userId: 'user1',
      juntas: [],
      members: [
        { id: 'm1', junta_id: 'j1', profile_id: 'user1', estado: 'retirado' } as never
      ],
      payments: [],
      schedules: []
    });
    expect(result.abandonedMidCycleCount).toBe(1);
  });

  it('detects suspicious abuse from payment notes', () => {
    const juntaId = 'junta1';
    const result = buildJuntaScoreStatsFromDomain({
      userId: 'user1',
      juntas: [{ id: juntaId, admin_id: 'user1', estado: 'activa' } as never],
      members: [],
      payments: [
        {
          id: 'pay1',
          junta_id: juntaId,
          profile_id: 'user1',
          estado: 'rejected',
          internal_note: 'sospecha de fraude',
          submitted_at: new Date().toISOString(),
          pagado_en: new Date().toISOString()
        } as never
      ],
      schedules: []
    });
    expect(result.suspiciousAbuseAttempts).toBe(1);
  });

  it('does not count pending payments as incumplimiento', () => {
    const juntaId = 'junta1';
    const scheduleId = 'schedule1';
    const now = new Date('2024-02-15');
    const deadline = new Date('2024-02-10');

    const result = buildJuntaScoreStatsFromDomain({
      userId: 'user1',
      juntas: [{ id: juntaId, admin_id: 'user1', estado: 'activa' } as never],
      members: [{ id: 'm1', junta_id: juntaId, profile_id: 'user1', estado: 'activo' } as never],
      payments: [
        {
          id: 'pay1',
          junta_id: juntaId,
          schedule_id: scheduleId,
          profile_id: 'user1',
          estado: 'submitted',
          submitted_at: new Date('2024-02-09').toISOString(),
          pagado_en: new Date('2024-02-09').toISOString()
        } as never
      ],
      schedules: [
        {
          id: scheduleId,
          junta_id: juntaId,
          fecha_vencimiento: deadline.toISOString(),
          estado: 'vencida',
          cuota_numero: 1
        } as never
      ],
      now
    });

    expect(result.defaultPaymentsRecent).toBe(0);
  });
});
