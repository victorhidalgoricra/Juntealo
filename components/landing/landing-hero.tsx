'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RevealOnScroll } from './reveal';

const demoMembers = ['AL', 'MC', 'DR', 'VN', 'LP'];

const juntaMembers = [
  { initials: 'JV', name: 'Juan V.' },
  { initials: 'RM', name: 'Rosa M.' },
  { initials: 'SL', name: 'Sara L.' },
  { initials: 'PC', name: 'Pedro C.' },
  { initials: 'AG', name: 'Ana G.' },
  { initials: 'LF', name: 'Luis F.' },
];

export function LandingHero() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(
      () => setActiveIndex(i => (i + 1) % juntaMembers.length),
      2500,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <RevealOnScroll className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 md:grid-cols-2 md:items-center md:px-6 md:py-16">
      <div className="space-y-6">
        <p className="inline-flex max-w-full items-center rounded-full bg-[var(--green-bg)] px-3 py-1 text-xs font-semibold text-[var(--green)]">
          ● Más de 120 juntas activas esta semana
        </p>

        <h1 className="break-words text-4xl font-bold leading-tight text-[var(--text)] md:text-5xl md:tracking-[-1.5px]">
          Tu plata, <span className="text-[var(--accent)]">al toque.</span>
        </h1>

        <p className="max-w-xl text-[17px] leading-relaxed text-[var(--muted)]">
          Únete a una junta pública o crea la tuya con tu grupo — sin banco, sin papeleos, sin WhatsApps perdidos.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link
            href="/explorar"
            className="inline-flex rounded-[var(--r-sm)] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-dark)]"
          >
            Buscar una junta →
          </Link>
          <Link
            href="/embajador"
            className="text-sm font-medium text-[var(--muted)] transition hover:text-[var(--accent)] sm:px-2"
          >
            Quiero ser embajador →
          </Link>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex">
            {demoMembers.map((member, index) => (
              <span
                key={member}
                className="-ml-2 inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--surface)] bg-[var(--accent-bg)] text-xs font-semibold text-[var(--accent)] first:ml-0"
                style={{ zIndex: 10 - index }}
              >
                {member}
              </span>
            ))}
          </div>
          <p className="text-sm text-[var(--muted)]">+2,400 personas ya gestionan sus juntas aquí</p>
        </div>
      </div>

      {/* Right — animated turno card */}
      <div className="relative rounded-[var(--r-xl)] bg-[var(--dark-1)] p-5 text-white shadow-xl sm:p-7">
        <span className="absolute right-6 top-6 inline-flex items-center rounded-full bg-[var(--green-bg)] px-3 py-1 text-xs font-semibold text-[var(--green)]">
          ● Activa
        </span>

        <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--dark-muted)]">Junta de ejemplo</p>
        <h2 className="mt-2 break-words text-2xl font-semibold">Taxistas Norte</h2>
        <p className="mt-1 text-sm text-[var(--dark-muted)]">Ahorro semanal con turnos automáticos</p>

        {/* Avatar ring — turno rotante */}
        <div className="mt-5 space-y-4 rounded-[var(--r)] bg-[var(--dark-3)] px-4 py-5">
          <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--dark-muted)]">
            Turno activo esta semana
          </p>
          <div className="flex items-center justify-center gap-2">
            {juntaMembers.map((m, i) => (
              <span
                key={m.initials}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold transition-all duration-300 ease-in-out"
                style={{
                  backgroundColor: 'var(--dark-4)',
                  color: i === activeIndex ? 'white' : 'var(--dark-muted)',
                  boxShadow:
                    i === activeIndex
                      ? '0 0 0 2px var(--green), 0 0 0 4px var(--dark-3)'
                      : 'none',
                  transform: i === activeIndex ? 'scale(1.25)' : 'scale(1)',
                }}
              >
                {m.initials}
              </span>
            ))}
          </div>
          <p className="text-center text-sm text-[var(--dark-muted)]">
            <span className="font-semibold text-white">{juntaMembers[activeIndex].name}</span>
            {' recibe esta semana · semana '}
            <span className="font-mono">{activeIndex + 1}</span>
            {` de ${juntaMembers.length}`}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-[var(--dark-4)] pt-4">
          <p className="text-sm text-[var(--dark-muted)]">Bolsa acumulada</p>
          <p className="font-mono text-sm font-semibold">S/ 4,000</p>
        </div>
      </div>
    </RevealOnScroll>
  );
}
