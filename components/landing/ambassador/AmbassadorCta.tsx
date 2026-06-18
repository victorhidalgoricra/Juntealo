import { ExternalLink } from 'lucide-react';
import { RevealOnScroll } from '@/components/landing/reveal';
import { AMBASSADOR_CALENDLY_URL } from './constants';

export function AmbassadorCta() {
  return (
    <RevealOnScroll className="bg-[var(--dark-1)]">
      <div className="mx-auto w-full max-w-4xl px-4 py-16 text-center md:py-[72px]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-light)]">
          Da el siguiente paso
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
          Hablemos de cómo puedes crecer con Juntealo
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[var(--dark-text)] md:text-base">
          Agenda una conversación de 30 minutos para conocer el programa, resolver tus dudas y
          descubrir cómo comenzar como embajador.
        </p>
        <a
          href={AMBASSADOR_CALENDLY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-7 inline-flex items-center gap-2 rounded-[var(--r-sm)] bg-white px-5 py-3 text-sm font-semibold text-[var(--dark-1)] transition hover:bg-[var(--faint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--dark-1)]"
        >
          Agendar una conversación
          <ExternalLink size={14} aria-hidden="true" />
        </a>
        <p className="mt-3 text-xs text-[var(--dark-muted)]">
          Sesión informativa de 30 minutos · Sin costo
        </p>
        <p className="mt-5 text-[13px] text-[var(--dark-muted)]">
          Los detalles del programa se comparten de manera personal durante la sesión.
        </p>
      </div>
    </RevealOnScroll>
  );
}
