import { RevealOnScroll } from '@/components/landing/reveal';

const stages = [
  {
    label: 'Empiezas',
    description:
      'Conoces el programa, compartes Juntealo y das los primeros pasos con tu comunidad.',
  },
  {
    label: 'Construyes comunidad',
    description:
      'Acompañas a tus referidos y contribuyes a que tengan una experiencia positiva.',
  },
  {
    label: 'Generas mayor impacto',
    description:
      'Tu crecimiento dentro del programa evoluciona junto con la participación de tu comunidad.',
  },
] as const;

export function AmbassadorActiveUser() {
  return (
    <RevealOnScroll className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
        Crecimiento
      </p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text)]">
        Tu crecimiento va de la mano con el de tu comunidad
      </h2>
      <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-[var(--muted)]">
        No se trata solamente de invitar personas. Reconocemos a quienes construyen comunidades
        activas, generan confianza y ayudan a que más grupos utilicen Juntealo.
      </p>

      <div className="mt-8 overflow-hidden rounded-[var(--r)] border border-[var(--border)] bg-[var(--accent-bg)]">
        <div className="grid grid-cols-1 divide-y divide-[var(--border)] md:grid-cols-3 md:divide-x md:divide-y-0">
          {stages.map(({ label, description }) => (
            <div key={label} className="p-6">
              <span className="inline-flex items-center rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-[11px] font-semibold text-white">
                {label}
              </span>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text)]">{description}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 text-[13px] text-[var(--muted)]">
        Las condiciones y oportunidades del programa se presentan de manera personal durante la
        sesión informativa.
      </p>
    </RevealOnScroll>
  );
}
