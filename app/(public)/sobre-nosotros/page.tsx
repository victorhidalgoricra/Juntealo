import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sobre nosotros | Juntealo',
};

export default function SobreNosotrosPage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24 md:py-32">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] md:text-4xl">
        Sobre nosotros
      </h1>
      <p className="mt-4 text-[var(--muted)]">Contenido en construcción.</p>
    </section>
  );
}
