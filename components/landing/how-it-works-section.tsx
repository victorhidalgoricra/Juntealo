import Link from 'next/link';

import { RevealOnScroll } from './reveal';

const steps = [
  {
    title: 'Encuentra una junta',
    description: 'Explora opciones según monto, aporte y frecuencia.'
  },
  {
    title: 'Revisa antes de unirte',
    description: 'Conoce los turnos, integrantes y condiciones de la junta.'
  },
  {
    title: 'Haz tus aportes',
    description: 'Cumple cada periodo y sigue el avance de tu junta desde Juntealo.'
  },
  {
    title: 'Recibe en tu turno',
    description: 'Cuando llegue tu turno, recibes la bolsa formada por los aportes del grupo.'
  }
];

export function HowItWorksSection() {
  return (
    <RevealOnScroll className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">ASÍ FUNCIONA</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text)]">Entra a una junta y recibe cuando llegue tu turno</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
        Explora juntas disponibles, revisa cómo funcionan y únete a la que mejor se adapte a lo que puedes aportar.
      </p>

      <div className="mt-5 flex justify-stretch sm:justify-start">
        <Link
          href="/como-funciona"
          className="inline-flex rounded-[var(--r-sm)] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-dark)]"
        >
          Cómo funciona →
        </Link>
      </div>

      <div className="relative mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-6 md:before:absolute md:before:left-10 md:before:right-10 md:before:top-7 md:before:h-px md:before:bg-[var(--border)] md:before:content-['']">
        {steps.map((step, index) => (
          <article
            key={step.title}
            className="group relative rounded-[var(--r)] border border-[var(--border)] bg-[var(--surface)] p-4 transition-all duration-200 hover:-translate-y-1 hover:border-[var(--accent)] hover:bg-[var(--accent-bg)] hover:shadow-md"
          >
            <span
              className="relative z-10 inline-flex h-14 w-14 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-base font-semibold text-[var(--muted)] transition-all duration-200 group-hover:border-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-white"
            >
              {index + 1}
            </span>
            <h3 className="mt-4 text-sm font-semibold text-[var(--text)] transition duration-200 group-hover:text-[var(--accent)]">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)] transition duration-200 group-hover:text-[var(--text)]">
              {step.description}
            </p>
          </article>
        ))}
      </div>
    </RevealOnScroll>
  );
}
