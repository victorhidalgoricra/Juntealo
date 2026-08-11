import Link from 'next/link';
import { MoneyIllustration } from './money-illustration';
import { CommunityIllustration } from './community-illustration';

export function DualPathSelector() {
  return (
    <section className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-8 md:grid-cols-2 md:gap-6 md:px-6 md:py-10">

        {/* --- tarjeta dinero --- */}
        <div className="group flex flex-col gap-5 rounded-[var(--r)] border-2 border-[var(--accent)] bg-[var(--accent-bg)] p-6 transition-shadow duration-200 hover:shadow-[var(--shadow-lg)]">
          <MoneyIllustration className="h-20 w-20 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:scale-105" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Para ti</p>
            <h2 className="mt-1 text-xl font-bold text-[var(--text)]">
              Consigue el dinero que necesitas, hoy
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Únete a una junta pública: aportas cada período y cobras la bolsa entera cuando te toca el turno — sin banco, sin papeleos.
            </p>
          </div>
          <Link
            href="/explorar"
            className="mt-auto inline-flex w-full items-center justify-center rounded-[var(--r-sm)] bg-[var(--accent)] px-6 py-3 text-[15px] font-semibold text-white transition-[background,opacity,transform] duration-150 hover:bg-[var(--accent-dark)] active:scale-[0.98]"
          >
            Ver juntas disponibles →
          </Link>
        </div>

        {/* --- tarjeta embajador --- */}
        <div className="group flex flex-col gap-5 rounded-[var(--r)] border border-[var(--border)] bg-[var(--surface)] p-6 transition-[border-color,box-shadow] duration-200 hover:border-[var(--accent)] hover:shadow-[var(--shadow)]">
          <CommunityIllustration className="h-20 w-20 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:scale-105" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Para organizadores</p>
            <h2 className="mt-1 text-xl font-bold text-[var(--text)]">
              Lidera tu grupo y gana por cada persona que sumas
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Crea tu junta, invita a tu comunidad y organiza grupos de ahorro. Mientras más crece tu red, más crecen tus beneficios.
            </p>
          </div>
          <Link
            href="/embajador"
            className="mt-auto inline-flex w-full items-center justify-center rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-[15px] font-semibold text-[var(--text)] transition-[background,border-color,transform] duration-150 hover:border-[var(--accent)] hover:bg-[var(--accent-bg)] active:scale-[0.98]"
          >
            Conocer el programa →
          </Link>
        </div>

      </div>
    </section>
  );
}
