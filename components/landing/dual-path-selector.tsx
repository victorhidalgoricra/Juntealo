import Link from 'next/link';
import { Search, Users } from 'lucide-react';

export function DualPathSelector() {
  return (
    <section className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-8 md:grid-cols-2 md:gap-6 md:px-6 md:py-10">

        <div className="flex flex-col gap-4 rounded-[var(--r)] border-2 border-[var(--accent)] bg-[var(--accent-bg)] p-6">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--r-sm)] bg-[var(--accent)]">
            <Search size={18} className="text-white" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Para ti</p>
            <h2 className="mt-1 text-xl font-bold text-[var(--text)]">Busco una junta pública</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Hay juntas abiertas con cupos libres. Únete, aporta cada período y cobra la bolsa cuando sea tu turno — sin banco, sin papeleos.
            </p>
          </div>
          <Link
            href="/explorar"
            className="mt-auto inline-flex w-full items-center justify-center rounded-[var(--r-sm)] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-dark)]"
          >
            Ver juntas disponibles →
          </Link>
        </div>

        <div className="flex flex-col gap-4 rounded-[var(--r)] border border-[var(--border)] bg-[var(--surface)] p-6 transition hover:border-[var(--accent)] hover:shadow-[var(--shadow)]">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--r-sm)] bg-[var(--accent-bg)]">
            <Users size={18} className="text-[var(--accent)]" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Para organizadores</p>
            <h2 className="mt-1 text-xl font-bold text-[var(--text)]">Quiero ser embajador</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Crea tu junta, invita a tu comunidad y lidera grupos de ahorro. Avanza dentro del programa mientras crece tu impacto.
            </p>
          </div>
          <Link
            href="/embajador"
            className="mt-auto inline-flex w-full items-center justify-center rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--accent-bg)]"
          >
            Conocer el programa →
          </Link>
        </div>

      </div>
    </section>
  );
}
