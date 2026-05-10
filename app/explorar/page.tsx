'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PublicNav } from '@/components/marketing/public-nav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchMyActiveMembershipsByJuntaIds, fetchPublicJuntas } from '@/services/juntas.repository';
import { Junta } from '@/types/domain';
import { useAuthStore } from '@/store/auth-store';
import { saveExploreJoinIntent } from '@/lib/explore-join-intent';
import { JuntaAvatar } from '@/components/junta-avatar';

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
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <PublicNav />
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-10">
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
          <div className="grid gap-3 md:grid-cols-2">
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
                : (membershipLoading ? 'Validando...' : (juntaIniciada ? 'En curso' : (cupoCompleto ? 'Cupo completo' : 'Unirme')));

              return (
                <Card key={j.id} className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <JuntaAvatar nombre={j.nombre} size="md" />
                      <h2 className="truncate font-semibold text-fg">{j.nombre}</h2>
                    </div>
                    <Badge className="shrink-0">Pública</Badge>
                  </div>
                  <p className="text-sm text-muted line-clamp-2">{j.descripcion ?? 'Sin descripción'}</p>
                  <p className="text-xs text-muted">Frecuencia: {j.frecuencia_pago} · Cuota: S/ {j.cuota_base ?? j.monto_cuota}</p>
                  <p className="text-xs text-faint">Inicio: {j.fecha_inicio} · Integrantes: {integrantes}/{j.participantes_max}</p>
                  <div className="flex gap-2">
                    <Button
                      disabled={joinDisabled}
                      onClick={() => handleJoinClick(j, { disabled: joinDisabled, isMember })}
                    >
                      {actionLabel}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ))}
      </main>
    </div>
  );
}
