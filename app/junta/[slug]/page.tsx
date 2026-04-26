'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PublicNav } from '@/components/marketing/public-nav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchPublicJuntaBySlug } from '@/services/juntas.repository';
import { Junta } from '@/types/domain';
import { useAuthStore } from '@/store/auth-store';
import { saveExploreJoinIntent } from '@/lib/explore-join-intent';

const FRECUENCIA_LABEL: Record<string, string> = {
  semanal: 'Semanal',
  quincenal: 'Quincenal',
  mensual: 'Mensual'
};

const ESTADO_LABEL: Record<string, string> = {
  borrador: 'En formación',
  activa: 'Activa',
  cerrada: 'Cerrada'
};

export default function JuntaPublicPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [junta, setJunta] = useState<Junta | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      const result = await fetchPublicJuntaBySlug(params.slug);
      if (!mounted) return;

      if (!result.ok) {
        setError('No pudimos cargar esta junta pública.');
        setLoading(false);
        return;
      }

      setJunta(result.data);
      setLoading(false);
    };

    load();
    return () => { mounted = false; };
  }, [params.slug]);

  const integrantes = useMemo(() => Number(junta?.integrantes_actuales ?? 0), [junta?.integrantes_actuales]);
  const participantesMax = Number(junta?.participantes_max ?? 0);
  const plazas = Math.max(0, participantesMax - integrantes);
  const cupoCompleto = junta ? integrantes >= participantesMax : false;
  const juntaIniciada = junta?.estado === 'activa';

  const handleUnirme = () => {
    if (!junta) return;
    if (!user?.id) {
      saveExploreJoinIntent(junta.id);
      router.push(`/login?redirect=${encodeURIComponent('/juntas')}`);
      return;
    }
    router.push('/juntas');
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <PublicNav />
      <main className="mx-auto max-w-2xl px-4 py-10">
        {loading && (
          <Card className="animate-pulse space-y-3">
            <div className="h-6 w-2/3 rounded bg-slate-200" />
            <div className="h-4 w-1/2 rounded bg-slate-100" />
            <div className="h-4 w-3/4 rounded bg-slate-100" />
          </Card>
        )}

        {!loading && error && (
          <Card>
            <p className="text-red-600">{error}</p>
          </Card>
        )}

        {!loading && !error && !junta && (
          <Card className="space-y-2 text-center">
            <p className="text-lg font-semibold">Junta no encontrada</p>
            <p className="text-sm text-slate-500">Esta junta no está disponible públicamente o el enlace es incorrecto.</p>
            <Link href="/explorar"><Button variant="outline">Ver juntas disponibles</Button></Link>
          </Card>
        )}

        {!loading && !error && junta && (
          <div className="space-y-4">
            <Card className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold">{junta.nombre}</h1>
                  {junta.descripcion && (
                    <p className="mt-1 text-sm text-slate-600">{junta.descripcion}</p>
                  )}
                </div>
                <Badge>{ESTADO_LABEL[junta.estado] ?? junta.estado}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Cuota por turno</p>
                  <p className="text-lg font-semibold">{junta.moneda ?? 'PEN'} {(junta.cuota_base ?? junta.monto_cuota).toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Frecuencia</p>
                  <p className="text-lg font-semibold">{FRECUENCIA_LABEL[junta.frecuencia_pago] ?? junta.frecuencia_pago}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Integrantes</p>
                  <p className="text-lg font-semibold">{integrantes}/{participantesMax}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Plazas disponibles</p>
                  <p className="text-lg font-semibold">{cupoCompleto ? '—' : plazas}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                <span>Inicio: {junta.fecha_inicio}</span>
                <span>·</span>
                <span>Tipo: {junta.tipo_junta === 'incentivo' ? 'Con incentivos' : 'Normal'}</span>
              </div>

              {cupoCompleto && (
                <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-700">
                  Esta junta ya no tiene cupo disponible.
                </div>
              )}

              {juntaIniciada && !cupoCompleto && (
                <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-700">
                  Esta junta ya está en curso. Las nuevas uniones no están disponibles.
                </div>
              )}

              {!juntaIniciada && !cupoCompleto && (
                <Button
                  className="w-full"
                  onClick={handleUnirme}
                >
                  {user ? 'Ir a juntas para unirme' : 'Iniciar sesión para unirme'}
                </Button>
              )}

              {user && (
                <p className="text-center text-xs text-slate-500">
                  Ya estás logueado como {user.nombre}.{' '}
                  <Link href="/juntas" className="underline">Ver mis juntas</Link>
                </p>
              )}
            </Card>

            <p className="text-center text-xs text-slate-400">
              ¿No conoces las juntas?{' '}
              <Link href="/explorar" className="underline">Explorar más juntas disponibles</Link>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
