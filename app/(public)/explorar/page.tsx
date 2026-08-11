'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchMyActiveMembershipsByJuntaIds, fetchPublicJuntas } from '@/services/juntas.repository';
import { Junta } from '@/types/domain';
import { useAuthStore } from '@/store/auth-store';
import { saveExploreJoinIntent } from '@/lib/explore-join-intent';
import { JuntaAvatar } from '@/components/junta-avatar';
import { Users, Zap } from 'lucide-react';

const frecuenciaCopy: Record<string, string> = {
  semanal: 'semana',
  quincenal: '15 días',
  mensual: 'mes',
};

export default function ExplorarPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [juntas, setJuntas] = useState<Junta[]>([]);
  const [memberJuntaIds, setMemberJuntaIds] = useState<string[]>([]);
  const [membershipLoading, setMembershipLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchPublicJuntas();
        if (!mounted) return;
        if (!result.ok) {
          console.error('[Explorar] error loading public catalog', result.message);
          setError(result.message || 'No pudimos cargar las juntas disponibles. Intenta nuevamente.');
          return;
        }
        setJuntas(result.data);
      } catch (caughtError) {
        console.error('[Explorar] unexpected load failure', caughtError);
        if (mounted) setError(caughtError instanceof Error ? caughtError.message : 'No pudimos cargar las juntas disponibles. Intenta nuevamente.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    const resolveMemberships = async () => {
      if (!user?.id || juntas.length === 0) {
        if (mounted) { setMemberJuntaIds([]); setMembershipLoading(false); }
        return;
      }
      if (mounted) setMembershipLoading(true);
      const result = await fetchMyActiveMembershipsByJuntaIds({
        profileId: user.id,
        juntaIds: juntas.map((junta) => junta.id)
      });
      if (!mounted) return;
      if (!result.ok) {
        console.error('[Explorar] membership lookup failed', result.message);
        setMemberJuntaIds([]);
        setMembershipLoading(false);
        return;
      }
      setMemberJuntaIds(result.data);
      setMembershipLoading(false);
    };
    resolveMemberships();
    return () => { mounted = false; };
  }, [juntas, user?.id]);

  const memberIds = useMemo(() => new Set(memberJuntaIds), [memberJuntaIds]);

  const { openCount, totalCupos } = useMemo(() => {
    let openCount = 0;
    let totalCupos = 0;
    for (const j of juntas) {
      const cupos = j.participantes_max - Number(j.integrantes_actuales ?? 0);
      if (j.estado !== 'activa' && j.estado !== 'cerrada' && cupos > 0) {
        openCount++;
        totalCupos += cupos;
      }
    }
    return { openCount, totalCupos };
  }, [juntas]);

  const resolveIsStarted = (junta: Junta) => junta.estado === 'activa';

  const handleJoinClick = (junta: Junta, options: { disabled: boolean; isMember: boolean }) => {
    if (options.disabled) return;
    if (!user?.id) {
      saveExploreJoinIntent(junta.id);
      router.push('/login');
      return;
    }
    if (options.isMember) {
      router.push(`/juntas/${junta.id}`);
      return;
    }
    router.push('/juntas');
  };

  return (
    <div>
      {/* Hero */}
      <div className="border-b border-[var(--border)] bg-[var(--accent-bg)]">
        <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            <Zap className="h-3.5 w-3.5" />
            Juntas públicas
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-[var(--text)] md:text-5xl md:tracking-[-1.5px]">
            Obtén tu plata<br className="hidden sm:block" /> al toque.
          </h1>
          <p className="mt-3 max-w-lg text-[17px] leading-relaxed text-[var(--muted)]">
            Únete a una junta, aportá tu cuota y cobrá el pozo cuando sea tu turno — sin banco, sin papeleos.
          </p>
          {!loading && !error && (
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text)]">
                <span className="h-2 w-2 rounded-full bg-[var(--green)]" />
                {openCount} {openCount === 1 ? 'junta abierta' : 'juntas abiertas'}
              </span>
              {totalCupos > 0 && (
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text)]">
                  <Users className="h-3.5 w-3.5 text-[var(--muted)]" />
                  {totalCupos} {totalCupos === 1 ? 'cupo disponible' : 'cupos disponibles'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        {loading && (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-52 animate-pulse rounded-[var(--r)] border border-[var(--border)] bg-[var(--surface)]" />
            ))}
          </div>
        )}

        {error && (
          <div className="space-y-3 rounded-[var(--r)] border border-[var(--border)] bg-[var(--surface)] p-6">
            <p className="text-[var(--destructive)]">{error}</p>
            <Button type="button" variant="outline" onClick={() => window.location.reload()}>Reintentar</Button>
          </div>
        )}

        {!loading && !error && juntas.length === 0 && (
          <div className="rounded-[var(--r)] border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
            <p className="font-semibold text-[var(--text)]">No hay juntas públicas por ahora.</p>
            <p className="mt-1 text-sm text-[var(--muted)]">¿Por qué no creás la primera?</p>
            <Link
              href="/register"
              className="mt-5 inline-flex rounded-[var(--r-sm)] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-dark)]"
            >
              Crear mi junta gratis →
            </Link>
          </div>
        )}

        {!loading && !error && juntas.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {juntas.map((j) => {
              const isOwner = Boolean(user?.id) && j.admin_id === user?.id;
              const integrantesBase = Number(j.integrantes_actuales ?? 0);
              const integrantes = isOwner ? Math.max(1, integrantesBase) : integrantesBase;
              const cuposLibres = j.participantes_max - integrantes;
              const cupoCompleto = cuposLibres <= 0;
              const isMember = isOwner || memberIds.has(j.id);
              const juntaIniciada = resolveIsStarted(j);
              const joinDisabled = (!isMember && (juntaIniciada || cupoCompleto)) || (Boolean(user?.id) && membershipLoading);
              const actionLabel = isMember
                ? 'Ver detalle'
                : (membershipLoading ? 'Validando...' : (juntaIniciada ? 'En curso' : (cupoCompleto ? 'Cupo completo' : 'Unirme →')));

              const cuota = j.cuota_base ?? j.monto_cuota;
              const bolsa = j.bolsa_base ?? (cuota * j.participantes_max);
              const periodoLabel = frecuenciaCopy[j.frecuencia_pago] ?? j.frecuencia_pago;
              const urgente = !cupoCompleto && !juntaIniciada && cuposLibres <= 2;

              return (
                <article
                  key={j.id}
                  className="flex flex-col gap-4 rounded-[var(--r)] border border-[var(--border)] bg-[var(--surface)] p-5 transition-shadow hover:shadow-[var(--shadow-lg)]"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <JuntaAvatar nombre={j.nombre} size="md" />
                      <div className="min-w-0">
                        <h2 className="break-words font-semibold text-[var(--text)]">{j.nombre}</h2>
                        <p className="mt-0.5 text-xs text-[var(--muted)]">{integrantes}/{j.participantes_max} personas</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      {urgente && (
                        <Badge variant="amber">Solo {cuposLibres} {cuposLibres === 1 ? 'cupo' : 'cupos'}</Badge>
                      )}
                      {juntaIniciada && <Badge variant="activo">En curso</Badge>}
                      {cupoCompleto && !juntaIniciada && <Badge>Completa</Badge>}
                    </div>
                  </div>

                  {/* Bolsa */}
                  <div className="rounded-[var(--r-sm)] bg-[var(--accent-bg)] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)]">Recibirás en tu turno</p>
                    <p className="mt-0.5 font-mono text-2xl font-bold text-[var(--text)]">
                      S/ {bolsa.toLocaleString('es-PE')}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      Aportando S/ {cuota.toLocaleString('es-PE')} por {periodoLabel}
                    </p>
                  </div>

                  {/* Description */}
                  {j.descripcion && (
                    <p className="text-sm text-[var(--muted)] line-clamp-2">{j.descripcion}</p>
                  )}

                  {/* CTA */}
                  <Button
                    disabled={joinDisabled}
                    onClick={() => handleJoinClick(j, { disabled: joinDisabled, isMember })}
                    className="mt-auto w-full"
                  >
                    {actionLabel}
                  </Button>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      {!loading && !error && (
        <div className="border-t border-[var(--border)] bg-[var(--dark-1)]">
          <div className="mx-auto max-w-6xl px-4 py-14 text-center md:px-6">
            <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
              ¿Preferís armar tu propio grupo?
            </h2>
            <p className="mt-2 text-sm text-[var(--dark-text)]">
              Creá tu junta gratis, invitá a tu gente y empezá hoy.
            </p>
            <Link
              href="/register"
              className="mt-6 inline-flex rounded-[var(--r-sm)] bg-white px-5 py-3 text-sm font-semibold text-[var(--dark-1)] transition hover:bg-[var(--faint)]"
            >
              Crear mi junta gratis →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
