import Link from 'next/link';
import { ArrowRight, Users } from 'lucide-react';
import { RevealOnScroll } from './reveal';

export function AmbassadorInviteSection() {
  return (
    <RevealOnScroll className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <div className="overflow-hidden rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--surface)]">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-10">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent-bg)] text-[var(--accent)]">
              <Users size={20} aria-hidden="true" />
            </span>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                Para quienes mueven comunidades
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text)] md:text-3xl">
                ¿Eres quien reúne y organiza a los demás?
              </h2>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--muted)] md:text-base">
                Como embajador de Juntealo, puedes ayudar a más personas a organizarse mejor,
                acompañar a tu comunidad y crecer con el impacto que generas.
              </p>
            </div>
          </div>

          <Link
            href="/embajador"
            className="inline-flex w-fit items-center gap-2 rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--bg)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--accent-light)] hover:bg-[var(--accent-bg)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
          >
            Conocer el programa
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </RevealOnScroll>
  );
}
