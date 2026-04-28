import Link from 'next/link';
import { RevealOnScroll } from './reveal';

export function FinalCTASection() {
  return (
    <RevealOnScroll className="bg-[var(--dark-1)]">
      <div className="mx-auto w-full max-w-4xl px-4 py-16 text-center md:py-[72px]">
        <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">¿Listo para tu primera junta digital?</h2>
        <p className="mt-3 text-sm text-[var(--dark-text)] md:text-base">Gratis, sin app, sin burocracia. Tu grupo empieza hoy.</p>
        <Link href="/register" className="mt-6 inline-flex rounded-[var(--r-sm)] bg-white px-5 py-3 text-sm font-semibold text-[var(--dark-1)] transition hover:bg-[var(--faint)]">
          Crear mi junta →
        </Link>
      </div>
    </RevealOnScroll>
  );
}
