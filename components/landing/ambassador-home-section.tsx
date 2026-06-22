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
    <RevealOnScroll>
      <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
          Programa de Embajadores
        </p>
        <div className="mt-2 md:flex md:items-end md:justify-between md:gap-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--text)]">
              ¿Ya organizas juntas con tu comunidad?
            </h2>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--muted)]">
              Conviértete en embajador. Ayuda a más grupos a organizarse mejor y avanza dentro
              del programa mientras tu impacto crece.
            </p>
          </div>
          <Link
            href="/embajador"
            className="mt-4 inline-flex shrink-0 items-center gap-2 rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--bg)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--accent-bg)] hover:border-[var(--accent)] hover:text-[var(--accent)] md:mt-0"
          >
            Conoce el programa →
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {pillars.map(({ Icon, title, description }) => (
            <article
              key={title}
              className="rounded-[var(--r)] border border-[var(--border)] bg-[var(--bg)] p-5"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--r-sm)] bg-[var(--accent-bg)]">
                <Icon size={18} className="text-[var(--accent)]" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold text-[var(--text)]">{title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </RevealOnScroll>
  );
}
