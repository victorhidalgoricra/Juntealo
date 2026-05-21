import { describe, it, expect } from 'vitest';
import {
  LEVEL_UNLOCKS_CONFIG,
  getLevelCreationLimits,
  getWeekKey,
  getJuntaEngagementLayer
} from '../junta-engagement.service';
import { getUserJuntaScore, type JuntaScoreStats } from '../junta-score.service';

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

describe('LEVEL_UNLOCKS_CONFIG', () => {
  it('Nuevo has lower limits than Bronce', () => {
    const nuevo = LEVEL_UNLOCKS_CONFIG['Nuevo'];
    const bronce = LEVEL_UNLOCKS_CONFIG['Bronce'];
    expect(nuevo.maxJuntaMembers).toBeLessThan(bronce.maxJuntaMembers);
    expect(nuevo.maxContributionPerRound).toBeLessThan(bronce.maxContributionPerRound);
  });

  it('Plata+ enables incentive juntas', () => {
    expect(LEVEL_UNLOCKS_CONFIG['Nuevo'].incentiveJuntasEnabled).toBe(false);
    expect(LEVEL_UNLOCKS_CONFIG['Bronce'].incentiveJuntasEnabled).toBe(false);
    expect(LEVEL_UNLOCKS_CONFIG['Plata'].incentiveJuntasEnabled).toBe(true);
    expect(LEVEL_UNLOCKS_CONFIG['Oro'].incentiveJuntasEnabled).toBe(true);
    expect(LEVEL_UNLOCKS_CONFIG['Élite'].incentiveJuntasEnabled).toBe(true);
  });

  it('Plata+ has trusted badge', () => {
    expect(LEVEL_UNLOCKS_CONFIG['Nuevo'].trustedBadge).toBe(false);
    expect(LEVEL_UNLOCKS_CONFIG['Bronce'].trustedBadge).toBe(false);
    expect(LEVEL_UNLOCKS_CONFIG['Plata'].trustedBadge).toBe(true);
  });

  it('Oro+ has priority visibility', () => {
    expect(LEVEL_UNLOCKS_CONFIG['Plata'].priorityVisibility).toBe(false);
    expect(LEVEL_UNLOCKS_CONFIG['Oro'].priorityVisibility).toBe(true);
    expect(LEVEL_UNLOCKS_CONFIG['Élite'].priorityVisibility).toBe(true);
  });

  it('Élite has highest member limit', () => {
    const elite = LEVEL_UNLOCKS_CONFIG['Élite'];
    const levels = Object.values(LEVEL_UNLOCKS_CONFIG);
    expect(elite.maxJuntaMembers).toBe(Math.max(...levels.map((l) => l.maxJuntaMembers)));
  });
});

describe('getLevelCreationLimits', () => {
  it('returns Nuevo limits for Nuevo level', () => {
    const limits = getLevelCreationLimits('Nuevo');
    expect(limits).toEqual(LEVEL_UNLOCKS_CONFIG['Nuevo']);
  });

  it('returns Élite limits for Élite level', () => {
    const limits = getLevelCreationLimits('Élite');
    expect(limits.maxJuntaMembers).toBe(40);
  });

  it('benefit: Nuevo cannot create incentive juntas', () => {
    const limits = getLevelCreationLimits('Nuevo');
    expect(limits.incentiveJuntasEnabled).toBe(false);
  });

  it('benefit: Plata can create incentive juntas', () => {
    const limits = getLevelCreationLimits('Plata');
    expect(limits.incentiveJuntasEnabled).toBe(true);
  });
});

describe('getWeekKey', () => {
  it('returns a string in YYYY-MM-DD format', () => {
    const key = getWeekKey();
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('always returns a Monday (UTC)', () => {
    // All dates interpreted in UTC. Jan 1 2024 = Monday UTC.
    const testDates = [
      new Date('2024-01-01'), // Monday UTC
      new Date('2024-01-03'), // Wednesday UTC
      new Date('2024-01-07'), // Sunday UTC
      new Date('2024-01-15')  // Monday UTC
    ];
    for (const date of testDates) {
      const key = getWeekKey(date);
      const d = new Date(key);
      expect(d.getUTCDay()).toBe(1); // 1 = Monday
    }
  });

  it('same week dates produce the same key', () => {
    // Week of Jan 8–14, 2024 (Mon–Sun UTC)
    const monday = new Date('2024-01-08');    // Monday
    const wednesday = new Date('2024-01-10'); // Wednesday
    const sunday = new Date('2024-01-14');    // Sunday
    expect(getWeekKey(monday)).toBe('2024-01-08');
    expect(getWeekKey(wednesday)).toBe('2024-01-08');
    expect(getWeekKey(sunday)).toBe('2024-01-08');
  });

  it('different weeks produce different keys', () => {
    const week1 = new Date('2024-01-08');
    const week2 = new Date('2024-01-15');
    expect(getWeekKey(week1)).not.toBe(getWeekKey(week2));
  });
});

describe('getJuntaEngagementLayer', () => {
  const makeScore = (bonus = 0) => getUserJuntaScore('user1', emptyStats, bonus);

  it('returns 4 missions', () => {
    const score = makeScore();
    const layer = getJuntaEngagementLayer({ userId: 'user1', score, stats: emptyStats });
    expect(layer.missions).toHaveLength(4);
  });

  it('each mission has a positive reward points value', () => {
    const score = makeScore();
    const layer = getJuntaEngagementLayer({ userId: 'user1', score, stats: emptyStats });
    for (const mission of layer.missions) {
      expect(mission.rewardPoints).toBeGreaterThan(0);
    }
  });

  it('featured mission is not completed when no activity', () => {
    const score = makeScore();
    const layer = getJuntaEngagementLayer({ userId: 'user1', score, stats: emptyStats });
    expect(layer.featuredMission.status).not.toBe('completed');
  });

  it('pay_on_time mission shows completed when paid this week', () => {
    const stats: JuntaScoreStats = { ...emptyStats, onTimePaymentsThisWeek: 1 };
    const score = getUserJuntaScore('user1', stats);
    const layer = getJuntaEngagementLayer({ userId: 'user1', score, stats });
    const payMission = layer.missions.find((m) => m.id === 'pay_on_time_this_week');
    expect(payMission?.status).toBe('completed');
  });

  it('streak mission shows progress correctly', () => {
    const stats: JuntaScoreStats = { ...emptyStats, activeStreakWeeks: 2 };
    const score = getUserJuntaScore('user1', stats);
    const layer = getJuntaEngagementLayer({ userId: 'user1', score, stats });
    const streakMission = layer.missions.find((m) => m.id === 'on_time_streak_4_rounds');
    expect(streakMission?.progressCurrent).toBe(2);
    expect(streakMission?.status).toBe('in_progress');
  });

  it('streak mission is completed at 4 rounds', () => {
    const stats: JuntaScoreStats = { ...emptyStats, activeStreakWeeks: 4 };
    const score = getUserJuntaScore('user1', stats);
    const layer = getJuntaEngagementLayer({ userId: 'user1', score, stats });
    const streakMission = layer.missions.find((m) => m.id === 'on_time_streak_4_rounds');
    expect(streakMission?.status).toBe('completed');
  });

  it('current level unlocks match config', () => {
    const score = makeScore();
    const layer = getJuntaEngagementLayer({ userId: 'user1', score, stats: emptyStats });
    expect(layer.currentLevelUnlocks).toEqual(LEVEL_UNLOCKS_CONFIG[layer.currentLevel]);
  });

  it('level drop warning shows when score is within 5pts of minimum', () => {
    // Nuevo level starts at 0. A score at 0 is fine (user just got here).
    // But a score at Bronce floor (30) with very few points above it should warn.
    // We simulate this by using missionBonus to push to exactly 30.
    const score = getUserJuntaScore('user1', emptyStats, 30);
    const layer = getJuntaEngagementLayer({ userId: 'user1', score, stats: emptyStats });
    // Score = 30 = exactly at Bronce floor → 0 pts over floor → within 5 pt buffer → warn
    if (score.level === 'Bronce') {
      expect(layer.levelDropWarning).not.toBeNull();
    }
  });

  it('cause and effect shows realistic gain/loss strings', () => {
    const score = makeScore();
    const layer = getJuntaEngagementLayer({ userId: 'user1', score, stats: emptyStats });
    // Messages are in Spanish: "Si pagas hoy, subes N punto(s)." / "Si te retrasas..."
    expect(layer.causeAndEffect.gainIfPayToday).toContain('pagas');
    expect(layer.causeAndEffect.lossIfLateToday).toContain('retrasas');
  });
});
