import { ExternalLink } from 'lucide-react';
import { RevealOnScroll } from '@/components/landing/reveal';
import { AMBASSADOR_CALENDLY_URL } from './constants';
import { AmbassadorIllustration } from './AmbassadorIllustration';

export function AmbassadorHero() {
  return (
    <RevealOnScroll className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 md:grid-cols-2 md:items-center md:px-6 md:py-16">
      <div className="space-y-6">
        <p className="inline-flex items-center rounded-full bg-[var(--accent-bg)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
          Programa de Embajadores
        </p>

        <h1 className="break-words text-4xl font-bold leading-tight text-[var(--text)] md:text-5xl md:tracking-[-1.5px]">
          Haz crecer tu comunidad.{' '}
          <span className="text-[var(--accent)]">Crece con Juntealo.</span>
        </h1>

        <p className="max-w-xl text-[17px] leading-relaxed text-[var(--muted)]">
          Recomienda una forma más simple y transparente de organizar juntas. Acompaña a tu
          comunidad y avanza dentro del programa a medida que generas un mayor impacto.
        </p>

        <div className="flex flex-wrap gap-3">
          <a
            href={AMBASSADOR_CALENDLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-[var(--r-sm)] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
          >
            Quiero ser embajador
            <ExternalLink size={14} aria-hidden="true" />
          </a>
          <a
            href="#como-funciona"
            className="inline-flex rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--accent-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
          >
            Descubrir cómo funciona
          </a>
        </div>

        <p className="text-sm text-[var(--muted)]">
          Conoce el programa en una sesión personal de 30 minutos.
        </p>
      </div>

      <AmbassadorIllustration />
    </RevealOnScroll>
  );
}
