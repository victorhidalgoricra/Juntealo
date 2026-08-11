import { RevealOnScroll } from './reveal';

const trustPoints = [
  {
    icon: '🔒',
    title: 'Tu dinero nunca pasa por Juntealo',
    description:
      'Los pagos van directo entre integrantes por Yape, Plin o transferencia bancaria. Juntealo solo lleva el registro, gestiona los turnos y envía recordatorios. Nunca tocamos tu dinero.',
  },
  {
    icon: '🪪',
    title: 'Identidad verificada al unirse',
    description:
      'Cada integrante verifica su identidad antes de participar. Así sabes con quién estás antes de empezar.',
  },
  {
    icon: '⚖️',
    title: 'Cumplimiento legal',
    description:
      'Operamos en conformidad con la Ley N° 29733 de Protección de Datos Personales del Perú.',
  },
];

const platformFeatures = [
  {
    icon: '🧾',
    title: 'Seguimiento en tiempo real',
    description: 'Visualiza aportes, turnos y avances del ciclo sin perder el contexto del grupo.',
    bg: 'bg-[var(--amber-bg)]',
  },
  {
    icon: '📱',
    title: 'Funciona en el celular',
    description: 'Diseño móvil primero para registrar pagos y avances en segundos.',
    bg: 'bg-[var(--accent-bg)]',
  },
  {
    icon: '🤝',
    title: 'Para cualquier grupo',
    description: 'Taxistas, universitarios, familias y emprendedores en un mismo sistema.',
    bg: 'bg-[var(--destructive-bg)]',
  },
];

export function TrustSection() {
  return (
    <RevealOnScroll className="border-y border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
        <div className="grid gap-10 md:grid-cols-2 md:gap-16">

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              Seguridad y transparencia
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text)]">
              Tu dinero, siempre en tus manos
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">
              Juntealo organiza tu junta — no es un banco ni un intermediario financiero.
            </p>

            <div className="mt-7 space-y-6">
              {trustPoints.map((point) => (
                <div key={point.title} className="flex gap-4">
                  <span className="mt-0.5 shrink-0 text-xl">{point.icon}</span>
                  <div>
                    <h3 className="text-[15px] font-semibold text-[var(--text)]">{point.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{point.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              Diseñado para el día a día
            </p>
            {platformFeatures.map((feature) => (
              <article
                key={feature.title}
                className={`flex gap-4 rounded-[var(--r)] border border-[var(--border)] p-4 ${feature.bg}`}
              >
                <span className="mt-0.5 shrink-0 text-xl">{feature.icon}</span>
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--text)]">{feature.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--muted)]">{feature.description}</p>
                </div>
              </article>
            ))}
          </div>

        </div>
      </div>
    </RevealOnScroll>
  );
}
