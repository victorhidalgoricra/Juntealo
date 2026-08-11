import { RevealOnScroll } from './reveal';

const features = [
  {
    icon: '🛡️',
    title: 'Score de confianza',
    description: 'Cada integrante acumula puntaje según su historial. El grupo toma mejores decisiones en cada ronda.',
    cardClass: 'bg-[var(--text)] text-white',
    descClass: 'text-slate-300',
  },
  {
    icon: '💬',
    title: 'Sin caos en WhatsApp',
    description: 'Todo el estado de aportes y turnos en un panel único y claro para el grupo.',
    cardClass: 'bg-[var(--accent-bg)] text-[var(--text)]',
    descClass: 'text-[var(--muted)]',
  },
  {
    icon: '🎯',
    title: 'Incentivos por turno',
    description: 'Quienes cobran antes pagan una cuota ligeramente mayor; quienes esperan más, pagan menos.',
    cardClass: 'bg-[var(--green-bg)] text-[var(--text)]',
    descClass: 'text-[var(--muted)]',
  },
];

export function MoneyTrustStrip() {
  return (
    <RevealOnScroll className="mx-auto w-full max-w-6xl px-4 pb-10 md:px-6">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
        Por qué Juntealo funciona
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {features.map((feature) => (
          <article
            key={feature.title}
            className={`rounded-[var(--r)] border border-[var(--border)] p-6 ${feature.cardClass}`}
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--r-sm)] bg-white/75 text-lg">
              {feature.icon}
            </span>
            <h3 className="mt-4 text-[15px] font-semibold">{feature.title}</h3>
            <p className={`mt-2 text-[13px] leading-relaxed ${feature.descClass}`}>{feature.description}</p>
          </article>
        ))}
      </div>
    </RevealOnScroll>
  );
}
