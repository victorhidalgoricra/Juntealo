import { ExternalLink } from 'lucide-react';
import { RevealOnScroll } from '@/components/landing/reveal';
import { AMBASSADOR_CALENDLY_URL } from './constants';

export function AmbassadorCta() {
  return (
    <RevealOnScroll className="bg-[var(--dark-1)]">
      <div className="mx-auto w-full max-w-4xl px-4 py-16 text-center md:py-[72px]">
        <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
          Conversemos sobre el programa
        </h2>
        <p className="mt-3 text-sm text-[var(--dark-text)] md:text-base">
          Agenda una sesión de 30 minutos para conocer cómo funciona el programa de embajadores y
          resolver tus dudas.
        </p>
        <a
          href={AMBASSADOR_CALENDLY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-[var(--r-sm)] bg-white px-5 py-3 text-sm font-semibold text-[var(--dark-1)] transition hover:bg-[var(--faint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--dark-1)]"
        >
          Agendar sesión en Calendly
          <ExternalLink size={14} aria-hidden="true" />
        </a>
        <p className="mt-3 text-xs text-[var(--dark-muted)]">Sesión de 30 minutos</p>
      </div>
    </RevealOnScroll>
  );
}
