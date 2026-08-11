import Link from 'next/link';
import { Share2, UserCheck, TrendingUp } from 'lucide-react';
import { RevealOnScroll } from './reveal';

const pillars = [
  {
    Icon: Share2,
    title: 'Conecta',
    description: 'Presenta Juntealo a personas y grupos que buscan una forma más clara de organizarse.',
  },
  {
    Icon: UserCheck,
    title: 'Acompaña',
    description: 'Orienta a tu comunidad para que aproveche la plataforma desde el primer día.',
  },
  {
    Icon: TrendingUp,
    title: 'Crece',
    description: 'Tu nivel en el programa avanza junto al impacto que generas en tu comunidad.',
  },
] as const;

export function AmbassadorHomeSection() {
  return (
    <RevealOnScroll className="border-y border-[var(--border)] bg-[var(--dark-1)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent-light)]">
          Programa de Embajadores
        </p>

        <div className="mt-3 md:flex md:items-end md:justify-between md:gap-10">
          <div className="space-y-3 md:max-w-xl">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              ¿Ya organizas juntas con tu comunidad?
            </h2>
            <p className="text-[15px] leading-relaxed text-[var(--dark-text)]">
              Conviértete en embajador. Ayuda a más grupos a organizarse, lidera desde tu comunidad
              y avanza dentro del programa a medida que crece tu impacto.
            </p>
          </div>
          <div className="mt-6 md:mt-0 md:shrink-0">
            <Link
              href="/embajador"
              className="inline-flex rounded-[var(--r-sm)] bg-white px-5 py-3 text-sm font-semibold text-[var(--dark-1)] transition hover:bg-[var(--faint)]"
            >
              Conoce el programa →
            </Link>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {pillars.map(({ Icon, title, description }) => (
            <article
              key={title}
              className="rounded-[var(--r)] border border-[var(--dark-4)] bg-[var(--dark-2)] p-5"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--r-sm)] bg-[var(--dark-3)]">
                <Icon size={18} className="text-[var(--accent-light)]" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold text-white">{title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--dark-muted)]">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </RevealOnScroll>
  );
}
