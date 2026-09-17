'use client';

import { useEffect, useMemo, useState } from 'react';
import { Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { fetchGlobalRanking, type GlobalRankingEntry } from '@/services/ranking.service';
import { type JuntaScoreLevel } from '@/services/junta-score.service';
import { cn } from '@/lib/utils';

const LEVEL_BADGE: Record<JuntaScoreLevel, { bg: string; text: string }> = {
  Nuevo:  { bg: 'bg-gray-100',   text: 'text-gray-500'   },
  Bronce: { bg: 'bg-orange-50',  text: 'text-orange-600' },
  Plata:  { bg: 'bg-slate-100',  text: 'text-slate-500'  },
  Oro:    { bg: 'bg-amber-50',   text: 'text-amber-600'  },
  Élite:  { bg: 'bg-violet-50',  text: 'text-violet-600' },
};

const TOP3_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
const ITEMS_PER_PAGE = 10;

const COL_HEADER = 'px-2 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted sm:px-4';

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

function LeaderboardRow({ entry, position }: { entry: GlobalRankingEntry; position: number }) {
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
      <td className="w-10 px-2 py-4 text-center sm:w-12 sm:px-4">
        <PositionCell position={position} />
      </td>

      {/* Miembro */}
      <td className="px-2 py-4 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
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
      <td className="px-2 py-4 text-right sm:px-4">
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
      <td className="px-2 py-4 text-right sm:px-4">
        <LevelBadge level={entry.level} size="sm" />
      </td>
    </tr>
  );
}

function LeaderboardTable({ ranking }: { ranking: GlobalRankingEntry[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-surface shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full sm:min-w-[560px]" role="table" aria-label="Ranking de miembros">
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
            {ranking.map((entry) => (
              <LeaderboardRow key={entry.profileId} entry={entry} position={entry.position} />
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
        <table className="w-full sm:min-w-[560px]">
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
                <td className="w-10 px-2 py-4 text-center sm:w-12 sm:px-4">
                  <div className="mx-auto h-7 w-7 animate-pulse rounded-full bg-muted/20" />
                </td>
                <td className="px-2 py-4 sm:px-4">
                  <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted/20" />
                    <div className="space-y-2">
                      <div className={cn('h-3.5 animate-pulse rounded bg-muted/20', i % 3 === 0 ? 'w-28' : i % 3 === 1 ? 'w-24' : 'w-32')} />
                      <div className="h-3 w-10 animate-pulse rounded bg-muted/10" />
                    </div>
                  </div>
                </td>
                <td className="px-2 py-4 text-right sm:px-4">
                  <div className="ml-auto h-6 w-8 animate-pulse rounded bg-muted/20" />
                </td>
                <td className="hidden px-4 py-4 sm:table-cell">
                  <div className="ml-auto h-4 w-5 animate-pulse rounded bg-muted/20" />
                </td>
                <td className="hidden px-4 py-4 sm:table-cell">
                  <div className="ml-auto h-4 w-4 animate-pulse rounded bg-muted/20" />
                </td>
                <td className="px-2 py-4 text-right sm:px-4">
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
    <div className="flex flex-col items-center gap-4 rounded-xl border border-border/60 bg-surface p-6 text-center shadow-sm sm:p-12">
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
  const [ranking, setRanking] = useState<GlobalRankingEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const totalPages = Math.ceil(ranking.length / ITEMS_PER_PAGE);
  const paginatedRanking = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return ranking.slice(start, start + ITEMS_PER_PAGE);
  }, [currentPage, ranking]);

  const pageNumbers = useMemo((): (number | string)[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

    const pages: (number | string)[] = [1];
    if (currentPage > 3) pages.push('ellipsis-start');
    for (let page = Math.max(2, currentPage - 1); page <= Math.min(totalPages - 1, currentPage + 1); page += 1) {
      pages.push(page);
    }
    if (currentPage < totalPages - 2) pages.push('ellipsis-end');
    pages.push(totalPages);
    return pages;
  }, [currentPage, totalPages]);

  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);
    fetchGlobalRanking()
      .then((result) => {
        if (!result.ok) {
          setLoadError(result.message);
          return;
        }
        setRanking(result.data);
        setCurrentPage(1);
      })
      .finally(() => setIsLoading(false));
  }, [user?.id]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 text-2xl font-semibold text-fg">Ranking</h1>
        <p className="text-sm text-muted">
          Reputación financiera de todos los miembros de Juntealo.
        </p>
      </div>

      {isLoading ? (
        <LeaderboardSkeleton />
      ) : loadError ? (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-surface p-6 text-center text-sm text-destructive">
          No pudimos cargar el ranking. Inténtalo nuevamente en unos minutos.
        </div>
      ) : ranking.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <LeaderboardTable ranking={paginatedRanking} />

          {totalPages > 1 && (
            <nav className="flex flex-wrap items-center justify-center gap-1" aria-label="Paginación del ranking">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                Anterior
              </Button>

              {pageNumbers.map((page) =>
                typeof page === 'string' ? (
                  <span key={page} className="select-none px-2 text-muted" aria-hidden="true">…</span>
                ) : (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    aria-label={`Ir a la página ${page}`}
                    aria-current={currentPage === page ? 'page' : undefined}
                    className={cn(
                      'min-w-[2rem] rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      currentPage === page
                        ? 'bg-fg text-surface'
                        : 'border border-border text-fg hover:bg-muted/5'
                    )}
                  >
                    {page}
                  </button>
                )
              )}

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              >
                Siguiente
              </Button>
            </nav>
          )}
        </>
      )}

      {!isLoading && ranking.length > 0 && (
        <p className="text-center text-xs text-muted">
          Ordenado por score, ciclos y antigüedad · {ranking.length} miembro{ranking.length !== 1 ? 's' : ''} con actividad
        </p>
      )}
    </div>
  );
}
