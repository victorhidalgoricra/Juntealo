import { Junta, JuntaMember, Payment, PaymentSchedule, Profile } from '@/types/domain';
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
  paymentsOnTimePct: number | null;
  isCurrentUser: boolean;
};

function getDisplayName(nombre?: string, email?: string): string {
  const fromNombre = (nombre ?? '').trim();
  if (fromNombre) return fromNombre;
  const fromEmail = (email ?? '').split('@')[0]?.replace(/[._-]+/g, ' ').trim();
  return fromEmail
    ? fromEmail.replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Miembro';
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'JD';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function computeRanking(params: {
  currentUserId: string;
  juntas: Junta[];
  members: JuntaMember[];
  schedules: PaymentSchedule[];
  payments: Payment[];
  profilesById: Record<string, Profile>;
}): RankingEntry[] {
  const profileIds = Array.from(new Set(params.members.map((m) => m.profile_id)));
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

    const displayName = getDisplayName(profile?.nombre, profile?.email);

    return {
      profileId,
      displayName,
      initials: getInitials(displayName),
      score: scoreResult.score,
      level: scoreResult.level,
      badge: getScoreBadge(scoreResult.level),
      juntasActivas,
      juntasCompletadas,
      paymentsOnTimePct,
      isCurrentUser: profileId === params.currentUserId,
    };
  });

  return entries.sort(
    (a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName, 'es')
  );
}
