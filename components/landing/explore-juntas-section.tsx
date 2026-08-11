import Link from 'next/link';
import { RevealOnScroll } from './reveal';
import { JuntaIcon } from '@/lib/junta-icon';
import { ArrowRight, Users } from 'lucide-react';

const publicJuntas = [
  { name: 'Taxistas Norte', people: '12 personas', fee: 'S/ 800', bolsa: 'S/ 9,600', type: 'Semanal', slots: 3, open: true },
  { name: 'Universidad', people: '10 personas', fee: 'S/ 800', bolsa: 'S/ 8,000', type: 'Quincenal', slots: 0, open: false },
  { name: 'Emprendedores Lima', people: '8 personas', fee: 'S/ 1,200', bolsa: 'S/ 9,600', type: 'Mensual', slots: 2, open: true },
];

export function ExploreJuntasSection() {
  const openCount = publicJuntas.filter((j) => j.open).length;
  const totalSlots = publicJuntas.reduce((acc, j) => acc + j.slots, 0);

  return (
    <RevealOnScroll className="border-y border-[var(--border)] bg-[var(--accent-bg)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              Juntas públicas abiertas ahora
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--text)] md:text-4xl md:tracking-[-1px]">
              Únete sin crear tu grupo
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-[var(--muted)]">
              Hay juntas activas con cupos libres. Revisa montos, frecuencias y únete hoy — sin banco, sin papeleos.
            </p>
          </div>

          {/* Stats */}
          <div className="flex shrink-0 flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text)]">
              <span className="h-2 w-2 rounded-full bg-[var(--green)]" />
              {openCount} {openCount === 1 ? 'junta abierta' : 'juntas abiertas'}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text)]">
              <Users className="h-3.5 w-3.5 text-[var(--muted)]" />
              {totalSlots} cupos disponibles
            </span>
          </div>
        </div>

        {/* Cards */}
        <div className="grid gap-3 md:grid-cols-3">
          {publicJuntas.map((junta) => (
            <article
              key={junta.name}
              className="flex flex-col gap-4 rounded-[var(--r)] border border-[var(--border)] bg-[var(--surface)] p-5 transition-shadow hover:shadow-[var(--shadow-lg)]"
            >
              <div className="flex items-center gap-3">
                <JuntaIcon nombre={junta.name} size="sm" />
                <div className="min-w-0">
                  <p className="break-words font-semibold text-[var(--text)]">{junta.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">{junta.people} · {junta.type}</p>
                </div>
              </div>

              <div className="rounded-[var(--r-sm)] bg-[var(--accent-bg)] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)]">Recibirás en tu turno</p>
                <p className="mt-0.5 font-mono text-xl font-bold text-[var(--text)]">{junta.bolsa}</p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">Aportando {junta.fee} por {junta.type.toLowerCase()}</p>
              </div>

              <div className="mt-auto">
                {junta.open ? (
                  <Link
                    href="/explorar"
                    className="flex w-full items-center justify-center gap-1.5 rounded-[var(--r-sm)] bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-dark)]"
                  >
                    {junta.slots <= 2 ? `Solo ${junta.slots} cupos — Unirme` : 'Unirme →'}
                  </Link>
                ) : (
                  <span className="flex w-full items-center justify-center rounded-[var(--r-sm)] bg-[var(--faint)] px-4 py-2.5 text-sm font-semibold text-[var(--muted)]">
                    Cupo completo
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-6 text-center">
          <Link
            href="/explorar"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] hover:underline"
          >
            Ver todas las juntas disponibles
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </RevealOnScroll>
  );
}
