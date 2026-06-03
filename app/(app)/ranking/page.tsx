'use client';

import { useEffect, useMemo, useState } from 'react';
import { Trophy } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
import { fetchPublicProfilesForRanking } from '@/services/profile.service';
import { computeRanking, type RankingEntry } from '@/services/ranking.service';
import { type JuntaScoreLevel } from '@/services/junta-score.service';
import { PublicProfile } from '@/types/domain';
import { cn } from '@/lib/utils';

const LEVEL_BADGE: Record<JuntaScoreLevel, { bg: string; text: string }> = {
  Nuevo:  { bg: 'bg-gray-100',   text: 'text-gray-500'   },
  Bronce: { bg: 'bg-orange-50',  text: 'text-orange-600' },
  Plata:  { bg: 'bg-slate-100',  text: 'text-slate-500'  },
  Oro:    { bg: 'bg-amber-50',   text: 'text-amber-600'  },
  Élite:  { bg: 'bg-violet-50',  text: 'text-violet-600' },
};

const TOP3_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const COL_HEADER = 'px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted';

function LevelBadge({ level, size = 'sm' }: { level: JuntaScoreLevel; size?: 'xs' | 'sm' }) {
  const { bg, text } = LEVEL_BADGE[level];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md font-medium',
        bg,
        text,
        size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
      )}
    >
      {level}
    </span>
  );
}

function PositionCell({ position }: { position: number }) {
  const medal = TOP3_MEDAL[position];
  if (medal) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center text-base" aria-label={`Posición ${position}`}>
        {medal}
      </span>
    );
  }
  return (
    <span className="text-sm font-medium tabular-nums text-muted">{position}</span>
  );
}

function LeaderboardRow({ entry, position }: { entry: RankingEntry; position: number }) {
  const isTop3 = position <= 3;

  return (
    <tr
      style={entry.isCurrentUser ? { boxShadow: 'inset 3px 0 0 var(--accent)' } : undefined}
      className={cn(
        'border-b border-border/30 last:border-0 transition-colors',
        entry.isCurrentUser
          ? 'bg-accent/[0.03] hover:bg-accent/[0.06]'
          : isTop3
          ? 'hover:bg-muted/5'
          : 'hover:bg-muted/5'
      )}
    >
      {/* # */}
      <td className="w-12 px-4 py-4 text-center">
        <PositionCell position={position} />
      </td>

      {/* Miembro */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
              entry.isCurrentUser ? 'bg-accent text-white' : 'bg-accent-bg text-accent'
            )}
            aria-hidden="true"
          >
            {entry.initials}
          </div>
          <div className="min-w-0">
            <p className={cn('truncate text-sm font-semibold', entry.isCurrentUser ? 'text-accent' : 'text-fg')}>
              {entry.displayName}
              {entry.isCurrentUser && (
                <span className="ml-1.5 text-xs font-normal text-accent/60">(tú)</span>
              )}
            </p>
            <div className="mt-1">
              <LevelBadge level={entry.level} size="xs" />
            </div>
          </div>
        </div>
      </td>

      {/* Score */}
      <td className="px-4 py-4 text-right">
        <span
          className={cn(
            'font-mono text-xl font-bold tabular-nums leading-none',
            entry.isCurrentUser ? 'text-accent' : 'text-fg'
          )}
        >
          {entry.score}
        </span>
      </td>

      {/* Puntuales */}
      <td className="hidden px-4 py-4 text-right sm:table-cell">
        {entry.onTimePayments > 0 ? (
          <span className="text-sm font-medium tabular-nums text-fg">{entry.onTimePayments}</span>
        ) : (
          <span className="text-sm text-muted">—</span>
        )}
      </td>

      {/* Ciclos */}
      <td className="hidden px-4 py-4 text-right sm:table-cell">
        <span className="text-sm font-medium tabular-nums text-fg">
          {entry.juntasCompletadas}
        </span>
      </td>

      {/* Nivel */}
      <td className="px-4 py-4 text-right">
        <LevelBadge level={entry.level} size="sm" />
      </td>
    </tr>
  );
}

function LeaderboardTable({ ranking }: { ranking: RankingEntry[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-surface shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px]" role="table" aria-label="Ranking de miembros">
          <thead>
            <tr className="border-b border-border/40">
              <th className={cn(COL_HEADER, 'w-12 text-center')} scope="col">#</th>
              <th className={cn(COL_HEADER, 'text-left')} scope="col">Miembro</th>
              <th className={cn(COL_HEADER, 'text-right')} scope="col">Score</th>
              <th className={cn(COL_HEADER, 'hidden text-right sm:table-cell')} scope="col">Puntuales</th>
              <th className={cn(COL_HEADER, 'hidden text-right sm:table-cell')} scope="col">Ciclos</th>
              <th className={cn(COL_HEADER, 'text-right')} scope="col">Nivel</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((entry, index) => (
              <LeaderboardRow key={entry.profileId} entry={entry} position={index + 1} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-surface shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="border-b border-border/40">
              <th className={cn(COL_HEADER, 'w-12 text-center')}>#</th>
              <th className={cn(COL_HEADER, 'text-left')}>Miembro</th>
              <th className={cn(COL_HEADER, 'text-right')}>Score</th>
              <th className={cn(COL_HEADER, 'hidden text-right sm:table-cell')}>Puntuales</th>
              <th className={cn(COL_HEADER, 'hidden text-right sm:table-cell')}>Ciclos</th>
              <th className={cn(COL_HEADER, 'text-right')}>Nivel</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 7 }, (_, i) => (
              <tr key={i} className="border-b border-border/30 last:border-0">
                <td className="w-12 px-4 py-4 text-center">
                  <div className="mx-auto h-7 w-7 animate-pulse rounded-full bg-muted/20" />
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted/20" />
                    <div className="space-y-2">
                      <div className={cn('h-3.5 animate-pulse rounded bg-muted/20', i % 3 === 0 ? 'w-28' : i % 3 === 1 ? 'w-24' : 'w-32')} />
                      <div className="h-3 w-10 animate-pulse rounded bg-muted/10" />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="ml-auto h-6 w-8 animate-pulse rounded bg-muted/20" />
                </td>
                <td className="hidden px-4 py-4 sm:table-cell">
                  <div className="ml-auto h-4 w-5 animate-pulse rounded bg-muted/20" />
                </td>
                <td className="hidden px-4 py-4 sm:table-cell">
                  <div className="ml-auto h-4 w-4 animate-pulse rounded bg-muted/20" />
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="ml-auto h-5 w-14 animate-pulse rounded-md bg-muted/20" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-border/60 bg-surface p-12 text-center shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/10">
        <Trophy className="text-muted" size={22} strokeWidth={1.5} />
      </div>
      <div>
        <p className="font-semibold text-fg">Sin datos de ranking aún</p>
        <p className="mt-1 text-sm text-muted">
          Únete o crea una junta para aparecer en el ranking.
        </p>
      </div>
    </div>
  );
}

export default function RankingPage() {
  const user = useAuthStore((s) => s.user);
  const { juntas, members, schedules, payments, isDataReady } = useAppStore();

  const safeJuntas   = useMemo(() => (Array.isArray(juntas)    ? juntas    : []), [juntas]);
  const safeMembers  = useMemo(() => (Array.isArray(members)   ? members   : []), [members]);
  const safeSchedules= useMemo(() => (Array.isArray(schedules) ? schedules : []), [schedules]);
  const safePayments = useMemo(() => (Array.isArray(payments)  ? payments  : []), [payments]);

  const [profilesById, setProfilesById] = useState<Record<string, PublicProfile>>({});
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  useEffect(() => {
    setLoadingProfiles(true);
    fetchPublicProfilesForRanking()
      .then((result) => {
        if (!result.ok) return;
        const mapped = result.data.reduce<Record<string, PublicProfile>>((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {});
        if (user && !mapped[user.id]) {
          mapped[user.id] = { id: user.id, nombre: (user as unknown as PublicProfile).nombre ?? '' };
        }
        if (process.env.NODE_ENV === 'development') {
          console.debug('[ranking] perfiles recibidos:', result.data.length);
          console.debug('[ranking] IDs en mapa:', Object.keys(mapped).length);
        }
        setProfilesById(mapped);
      })
      .finally(() => setLoadingProfiles(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const ranking = useMemo(() => {
    if (!user || Object.keys(profilesById).length === 0) return [];
    const entries = computeRanking({
      currentUserId: user.id,
      juntas:    safeJuntas,
      members:   safeMembers,
      schedules: safeSchedules,
      payments:  safePayments,
      profilesById,
    });
    if (process.env.NODE_ENV === 'development') {
      console.debug('[ranking] entries calculados:', entries.length);
    }
    return entries;
  }, [user, safeJuntas, safeMembers, safeSchedules, safePayments, profilesById]);

  const isLoading = !isDataReady || loadingProfiles;

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <Trophy className="text-accent" size={20} strokeWidth={1.5} />
          <h1 className="text-2xl font-semibold text-fg">Ranking</h1>
        </div>
        <p className="text-sm text-muted">
          Reputación financiera de todos los miembros de Juntealo.
        </p>
      </div>

      {isLoading ? (
        <LeaderboardSkeleton />
      ) : ranking.length === 0 ? (
        <EmptyState />
      ) : (
        <LeaderboardTable ranking={ranking} />
      )}

      {!isLoading && ranking.length > 0 && (
        <p className="text-center text-xs text-muted">
          Ordenado por score de reputación · {ranking.length} miembro{ranking.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
