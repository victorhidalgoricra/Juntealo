'use client';

import { useEffect, useMemo, useState } from 'react';
import { Trophy, TrendingUp, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
import { fetchProfilesByIds } from '@/services/profile.service';
import { computeRanking, type RankingEntry } from '@/services/ranking.service';
import { Profile } from '@/types/domain';
import { cn } from '@/lib/utils';

const TOP3_STYLES: Record<number, { icon: string; ring: string }> = {
  1: { icon: '🥇', ring: 'ring-yellow-400/50 bg-yellow-50' },
  2: { icon: '🥈', ring: 'ring-slate-400/50 bg-slate-50' },
  3: { icon: '🥉', ring: 'ring-orange-400/50 bg-orange-50' },
};

function RankingSkeletonRow() {
  return (
    <Card className="flex items-center gap-4 p-4">
      <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-slate-200" />
      <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-slate-200" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="space-y-2 text-right">
        <div className="ml-auto h-5 w-12 animate-pulse rounded bg-slate-200" />
        <div className="ml-auto h-3 w-16 animate-pulse rounded bg-slate-200" />
      </div>
    </Card>
  );
}

function PositionBadge({ position }: { position: number }) {
  const style = TOP3_STYLES[position];
  if (style) {
    return (
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-2 text-lg', style.ring)}>
        {style.icon}
      </div>
    );
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-sm font-bold text-muted">
      {position}
    </div>
  );
}

function UserAvatar({ initials, isCurrentUser }: { initials: string; isCurrentUser: boolean }) {
  return (
    <div
      className={cn(
        'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
        isCurrentUser ? 'bg-accent text-white' : 'bg-accent-bg text-accent'
      )}
    >
      {initials}
    </div>
  );
}

function RankingRow({ entry, position }: { entry: RankingEntry; position: number }) {
  const juntaCount = entry.juntasActivas + entry.juntasCompletadas;

  return (
    <Card
      className={cn(
        'flex items-center gap-3 p-4',
        entry.isCurrentUser && 'border-accent/40 bg-accent/5 ring-1 ring-accent/20'
      )}
    >
      <PositionBadge position={position} />

      <UserAvatar initials={entry.initials} isCurrentUser={entry.isCurrentUser} />

      <div className="min-w-0 flex-1">
        <p className={cn('truncate font-semibold text-fg', entry.isCurrentUser && 'text-accent')}>
          {entry.displayName}
          {entry.isCurrentUser && (
            <span className="ml-1.5 text-xs font-normal text-accent/60">(tú)</span>
          )}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="text-xs text-muted">{entry.badge}</span>
          {juntaCount > 0 && (
            <span className="text-xs text-muted">
              · {juntaCount} junta{juntaCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        {entry.paymentsOnTimePct !== null ? (
          <>
            <p className="text-sm font-semibold text-green">{entry.paymentsOnTimePct}%</p>
            <p className="text-[11px] text-muted">a tiempo</p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-muted">–</p>
            <p className="text-[11px] text-muted">sin historial</p>
          </>
        )}
      </div>

      <div className="shrink-0 text-right">
        <p className={cn('font-mono text-2xl font-bold leading-none', entry.isCurrentUser ? 'text-accent' : 'text-fg')}>
          {entry.score}
        </p>
        <p className="text-[11px] text-muted">pts</p>
      </div>
    </Card>
  );
}

function CurrentUserCard({
  entry,
  position,
  total,
}: {
  entry: RankingEntry;
  position: number;
  total: number;
}) {
  const topPct = total > 1 ? Math.round((1 - (position - 1) / (total - 1)) * 100) : 100;

  return (
    <Card dark className="text-white">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center self-center rounded-full border-[4px] border-emerald-400">
          <p className="font-mono text-3xl font-bold leading-none">{entry.score}</p>
          <p className="text-[10px] text-[var(--dark-muted)]">/ 100</p>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="dark">{entry.badge}</Badge>
            <span className="text-sm text-[var(--dark-muted)]">Posición #{position} de {total}</span>
          </div>
          <p className="text-xl font-bold">{entry.displayName}</p>
          <div className="flex flex-wrap gap-4 text-sm text-[var(--dark-muted)]">
            {entry.juntasActivas > 0 && (
              <span>{entry.juntasActivas} junta{entry.juntasActivas !== 1 ? 's' : ''} activa{entry.juntasActivas !== 1 ? 's' : ''}</span>
            )}
            {entry.juntasCompletadas > 0 && (
              <span>{entry.juntasCompletadas} ciclo{entry.juntasCompletadas !== 1 ? 's' : ''} completado{entry.juntasCompletadas !== 1 ? 's' : ''}</span>
            )}
            {entry.paymentsOnTimePct !== null && (
              <span className="text-emerald-400">{entry.paymentsOnTimePct}% pagos a tiempo</span>
            )}
          </div>
          <div className="flex items-center gap-3 pt-1">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-400 transition-[width] duration-700"
                style={{ width: `${topPct}%` }}
              />
            </div>
            <p className="text-[11px] text-[var(--dark-muted)]">Top {topPct}%</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function RankingPage() {
  const user = useAuthStore((s) => s.user);
  const { juntas, members, schedules, payments, isDataReady } = useAppStore();

  const safeJuntas = useMemo(() => (Array.isArray(juntas) ? juntas : []), [juntas]);
  const safeMembers = useMemo(() => (Array.isArray(members) ? members : []), [members]);
  const safeSchedules = useMemo(() => (Array.isArray(schedules) ? schedules : []), [schedules]);
  const safePayments = useMemo(() => (Array.isArray(payments) ? payments : []), [payments]);

  const [profilesById, setProfilesById] = useState<Record<string, Profile>>({});
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  useEffect(() => {
    const profileIds = Array.from(new Set(safeMembers.map((m) => m.profile_id)));
    if (profileIds.length === 0) {
      setLoadingProfiles(false);
      return;
    }

    setLoadingProfiles(true);
    fetchProfilesByIds(profileIds)
      .then((result) => {
        if (!result.ok) return;
        const mapped = result.data.reduce<Record<string, Profile>>((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {});
        if (user && !mapped[user.id]) mapped[user.id] = user;
        setProfilesById(mapped);
      })
      .finally(() => {
        setLoadingProfiles(false);
      });
  }, [safeMembers, user]);

  const ranking = useMemo(() => {
    if (!user || safeMembers.length === 0) return [];
    return computeRanking({
      currentUserId: user.id,
      juntas: safeJuntas,
      members: safeMembers,
      schedules: safeSchedules,
      payments: safePayments,
      profilesById,
    });
  }, [user, safeJuntas, safeMembers, safeSchedules, safePayments, profilesById]);

  const currentUserEntry = ranking.find((e) => e.isCurrentUser) ?? null;
  const currentUserPosition = currentUserEntry ? ranking.indexOf(currentUserEntry) + 1 : null;

  const isLoading = !isDataReady || loadingProfiles;

  if (!user) return null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="text-accent" size={22} strokeWidth={1.5} />
          <h1 className="text-2xl font-semibold text-fg">Ranking</h1>
        </div>
        <p className="text-sm text-muted">
          Clasificación por score de reputación financiera entre los participantes de tus juntas.
        </p>
      </div>

      {/* Current user card */}
      {!isLoading && currentUserEntry && currentUserPosition && (
        <CurrentUserCard
          entry={currentUserEntry}
          position={currentUserPosition}
          total={ranking.length}
        />
      )}

      {/* Stats bar */}
      {!isLoading && ranking.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center">
            <Users className="mx-auto mb-1 text-slate-400" size={18} strokeWidth={1.5} />
            <p className="font-mono text-2xl font-bold text-fg">{ranking.length}</p>
            <p className="text-xs text-muted">Participantes</p>
          </Card>
          <Card className="p-4 text-center">
            <Trophy className="mx-auto mb-1 text-yellow-500" size={18} strokeWidth={1.5} />
            <p className="font-mono text-2xl font-bold text-fg">
              #{currentUserPosition ?? '–'}
            </p>
            <p className="text-xs text-muted">Tu posición</p>
          </Card>
          <Card className="p-4 text-center">
            <TrendingUp className="mx-auto mb-1 text-emerald-500" size={18} strokeWidth={1.5} />
            <p className="font-mono text-2xl font-bold text-fg">
              {currentUserEntry?.score ?? '–'}
            </p>
            <p className="text-xs text-muted">Tu score</p>
          </Card>
        </div>
      )}

      {/* Leaderboard */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-fg">Tabla de posiciones</h2>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <RankingSkeletonRow key={i} />
            ))}
          </div>
        ) : ranking.length === 0 ? (
          <Card className="p-8 text-center">
            <Trophy className="mx-auto mb-3 text-slate-300" size={36} strokeWidth={1} />
            <p className="font-semibold text-fg">Sin datos de ranking aún</p>
            <p className="mt-1 text-sm text-muted">
              Únete o crea una junta para aparecer en el ranking y comparar tu reputación con otros participantes.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {ranking.map((entry, index) => (
              <RankingRow key={entry.profileId} entry={entry} position={index + 1} />
            ))}
          </div>
        )}
      </section>

      {ranking.length > 0 && (
        <p className="text-center text-xs text-muted">
          El ranking incluye a los participantes de tus juntas activas e históricas.
        </p>
      )}
    </div>
  );
}
