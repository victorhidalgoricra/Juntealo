'use client';

import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchMyActiveMembershipsByJuntaIds, fetchPublicJuntas } from '@/services/juntas.repository';
import { Junta } from '@/types/domain';
import { useAuthStore } from '@/store/auth-store';
import { saveExploreJoinIntent } from '@/lib/explore-join-intent';
import { JuntaAvatar } from '@/components/junta-avatar';
import { JuntaAmountBlock } from '@/components/ui/junta-amount-block';

function money(value: number) {
  return `S/ ${Math.round(value).toLocaleString('es-PE')}`;
}

function formatFecha(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return format(parseISO(iso), 'dd MMM yyyy', { locale: es });
  } catch {
    return null;
  }
}

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
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const resolveMemberships = async () => {
      if (!user?.id || juntas.length === 0) {
        if (mounted) {
          setMemberJuntaIds([]);
          setMembershipLoading(false);
        }
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

    return () => {
      mounted = false;
    };
  }, [juntas, user?.id]);

  const memberIds = useMemo(() => new Set(memberJuntaIds), [memberJuntaIds]);
  const emptyMessage = useMemo(() => 'No hay juntas públicas por ahora.', []);
  const resolveIsStarted = (junta: Junta) => {
    return junta.estado === 'activa';
  };

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
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-10">
      <h1 className="text-3xl font-bold">Juntas disponibles</h1>
      <p className="text-slate-600">Explora juntas públicas y únete con un solo paso.</p>

      {loading && <Card>Cargando juntas públicas...</Card>}
      {error && (
        <Card className="space-y-2">
          <p className="text-red-600">{error}</p>
          <Button type="button" variant="outline" onClick={() => window.location.reload()}>Reintentar</Button>
        </Card>
      )}

      {!loading && !error && (juntas.length === 0 ? (
        <Card>{emptyMessage}</Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {juntas.map((j) => {
            const isOwner = Boolean(user?.id) && j.admin_id === user?.id;
            const integrantesBase = Number(j.integrantes_actuales ?? 0);
            const integrantes = isOwner ? Math.max(1, integrantesBase) : integrantesBase;
            const cupoCompleto = integrantes >= j.participantes_max;
            const isMember = isOwner || memberIds.has(j.id);
            const juntaIniciada = resolveIsStarted(j);
            const joinDisabled = (!isMember && (juntaIniciada || cupoCompleto)) || (Boolean(user?.id) && membershipLoading);
            const actionLabel = isMember
              ? 'Ver detalle'
              : (membershipLoading ? 'Validando...' : (juntaIniciada ? 'En curso' : (cupoCompleto ? 'Cupo completo' : 'Unirme →')));

            const cuota = Number(j.cuota_base ?? j.monto_cuota ?? 0) || null;
            const bolsa = (cuota && j.participantes_max) ? cuota * j.participantes_max : null;
            const cuposLibres = Math.max(0, j.participantes_max - integrantes);

            return (
              <Card
                key={j.id}
                className="flex flex-col gap-5 rounded-[var(--r-xl)] p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)] sm:p-6"
              >
                {/* 1. Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <JuntaAvatar nombre={j.nombre} size="lg" />
                    <div className="min-w-0 space-y-1">
                      <h2 className="break-words text-base font-bold leading-tight text-fg">{j.nombre}</h2>
                      <p className="text-xs leading-snug text-muted">{integrantes}/{j.participantes_max} personas · {j.frecuencia_pago}</p>
                    </div>
                  </div>
                  <Badge
                    className={j.visibilidad === 'privada'
                      ? 'shrink-0'
                      : 'shrink-0 gap-1.5 bg-green-bg text-green'}
                  >
                    {j.visibilidad !== 'privada' && <span className="h-1.5 w-1.5 rounded-full bg-green" />}
                    {j.visibilidad === 'privada' ? 'Privada' : 'Pública'}
                  </Badge>
                </div>

                {/* 2. Monto destacado */}
                {bolsa !== null && (
                  <JuntaAmountBlock
                    amount={money(bolsa)}
                    sublabel={`Aportando ${money(cuota!)} por ${j.frecuencia_pago}`}
                    className="rounded-[var(--r-lg)] px-5 py-5 [&>p:nth-child(2)]:mt-1 [&>p:nth-child(2)]:text-4xl [&>p:nth-child(3)]:mt-1.5"
                  />
                )}

                {/* 3. Descripción */}
                <p className="line-clamp-2 text-sm font-medium leading-relaxed text-fg">{j.descripcion ?? 'Sin descripción'}</p>

                {/* 4. Grilla 2x2 de datos */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-[var(--r-md)] bg-slate-50 px-3.5 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Cuota</p>
                    <p className="mt-1 text-sm font-semibold text-fg">{cuota !== null ? money(cuota) : '—'}</p>
                  </div>
                  <div className="rounded-[var(--r-md)] bg-slate-50 px-3.5 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Frecuencia</p>
                    <p className="mt-1 text-sm font-semibold capitalize text-fg">{j.frecuencia_pago ?? '—'}</p>
                  </div>
                  <div className="rounded-[var(--r-md)] bg-slate-50 px-3.5 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Inicio</p>
                    <p className="mt-1 text-sm font-semibold text-fg">{formatFecha(j.fecha_inicio) ?? '—'}</p>
                  </div>
                  <div className="rounded-[var(--r-md)] bg-slate-50 px-3.5 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Cupos</p>
                    <p className="mt-1 text-sm font-semibold text-fg">{cuposLibres} libres</p>
                  </div>
                </div>

                {/* 5. Botón */}
                <Button
                  disabled={joinDisabled}
                  onClick={() => handleJoinClick(j, { disabled: joinDisabled, isMember })}
                  size="lg"
                  className="mt-auto w-full rounded-[var(--r-md)] uppercase tracking-[0.04em]"
                >
                  {actionLabel}
                </Button>

                {/* 6. Estado de integrantes */}
                <p className="text-center text-xs text-muted">{integrantes} de {j.participantes_max} integrantes confirmados</p>
              </Card>
            );
          })}
        </div>
      ))}
    </div>
  );
}
