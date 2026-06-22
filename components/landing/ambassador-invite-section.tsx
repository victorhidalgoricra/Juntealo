import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { RevealOnScroll } from './reveal';

export function AmbassadorInviteSection() {
  return (
    <RevealOnScroll className="mx-auto w-full max-w-6xl px-4 pb-10 md:px-6 md:pb-14">
      <div className="rounded-[var(--r)] border border-[var(--border)] bg-[var(--accent-bg)] px-5 py-5 md:flex md:items-center md:justify-between md:gap-8 md:px-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--text)] md:text-2xl">
            ¿Ya organizas juntas con tu comunidad?
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)] md:text-[15px]">
            Organiza todo más fácil y hazla crecer con Juntealo.
          </p>
        </div>

        <Link
          href="/embajador"
          className="mt-4 inline-flex w-fit shrink-0 items-center gap-2 text-sm font-semibold text-[var(--accent)] transition hover:text-[var(--accent-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 md:mt-0"
        >
          Conoce el programa de embajadores
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </RevealOnScroll>
  );
}
