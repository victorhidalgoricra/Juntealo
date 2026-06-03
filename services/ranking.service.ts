import { Junta, JuntaMember, Payment, PaymentSchedule, PublicProfile } from '@/types/domain';
import {
  buildJuntaScoreStatsFromDomain,
  getUserJuntaScore,
  getScoreBadge,
  type JuntaScoreLevel,
} from './junta-score.service';

export type RankingEntry = {
  profileId: string;
  displayName: string;
  initials: string;
  score: number;
  level: JuntaScoreLevel;
  badge: string;
  juntasActivas: number;
  juntasCompletadas: number;
  onTimePayments: number;
  paymentsOnTimePct: number | null;
  isCurrentUser: boolean;
};

function getShortDisplayName(profile?: PublicProfile): string {
  const firstName = (profile?.first_name ?? '').trim();
  const paternalLastName = (profile?.paternal_last_name ?? '').trim();
  if (firstName) {
    return paternalLastName ? `${firstName} ${paternalLastName[0].toUpperCase()}.` : firstName;
  }

  const nombre = (profile?.nombre ?? '').trim();
  if (nombre) {
    const parts = nombre.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const lastName = parts[parts.length - 1];
      return `${parts[0]} ${lastName[0].toUpperCase()}.`;
    }
    return parts[0] ?? 'Miembro';
  }
  return 'Miembro';
}

function getInitials(name: string): string {
  const cleaned = name.replace(/\.$/, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'JD';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getCreatedAtTime(profile?: PublicProfile): number {
  const createdAt = profile?.created_at;
  if (!createdAt) return Number.POSITIVE_INFINITY;
  const time = new Date(createdAt).getTime();
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
}

export function computeRanking(params: {
  currentUserId: string;
  juntas: Junta[];
  members: JuntaMember[];
  schedules: PaymentSchedule[];
  payments: Payment[];
  profilesById: Record<string, PublicProfile>;
}): RankingEntry[] {
  const profileIds = Object.keys(params.profilesById);
  if (profileIds.length === 0) return [];

  const entries = profileIds.map((profileId): RankingEntry => {
    const profile = params.profilesById[profileId];

    const stats = buildJuntaScoreStatsFromDomain({
      userId: profileId,
      juntas: params.juntas,
      members: params.members,
      payments: params.payments,
      schedules: params.schedules,
    });

    const scoreResult = getUserJuntaScore(profileId, stats);

    const activeMemberJuntaIds = new Set(
      params.members
        .filter((m) => m.profile_id === profileId && m.estado !== 'retirado')
        .map((m) => m.junta_id)
    );

    const juntasActivas = params.juntas.filter(
      (j) => activeMemberJuntaIds.has(j.id) && j.estado === 'activa'
    ).length;

    const juntasCompletadas = params.juntas.filter(
      (j) => activeMemberJuntaIds.has(j.id) && j.estado === 'cerrada'
    ).length;

    const totalPayments =
      stats.onTimePaymentsLifetime +
      stats.latePaymentsLifetime +
      stats.defaultPaymentsLifetime;

    const paymentsOnTimePct =
      totalPayments > 0
        ? Math.round((stats.onTimePaymentsLifetime / totalPayments) * 100)
        : null;

    const displayName = getShortDisplayName(profile);

    return {
      profileId,
      displayName,
      initials: getInitials(displayName),
      score: scoreResult.score,
      level: scoreResult.level,
      badge: getScoreBadge(scoreResult.level),
      juntasActivas,
      juntasCompletadas,
      onTimePayments: stats.onTimePaymentsLifetime,
      paymentsOnTimePct,
      isCurrentUser: profileId === params.currentUserId,
    };
  });

  return entries.sort((a, b) => {
    const scoreOrder = b.score - a.score;
    if (scoreOrder !== 0) return scoreOrder;

    const completedCyclesOrder = b.juntasCompletadas - a.juntasCompletadas;
    if (completedCyclesOrder !== 0) return completedCyclesOrder;

    const createdAtOrder =
      getCreatedAtTime(params.profilesById[a.profileId]) -
      getCreatedAtTime(params.profilesById[b.profileId]);
    if (createdAtOrder !== 0) return createdAtOrder;

    return a.displayName.localeCompare(b.displayName, 'es');
  });
}
