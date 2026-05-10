import { RevealOnScroll } from './reveal';

const steps = [
  {
    title: 'Crea la junta',
    description: 'Define monto, personas, frecuencia e incentivos.'
  },
  {
    title: 'Invita a tu grupo',
    description: 'Comparte enlace de invitación y verificación de identidad.'
  },
  {
    title: 'Todos aportan',
    description: 'Yape, Plin o transferencia bancaria, recordatorios automáticos y control de mora.'
  },
  {
    title: 'El turno cobra',
    description: 'Desembolso con trazabilidad completa.'
  }
];

export function HowItWorksSection() {
  return (
    <RevealOnScroll className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Así funciona</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text)]">De la idea al cobro en 4 pasos</h2>

      <div className="relative mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6 md:before:absolute md:before:left-10 md:before:right-10 md:before:top-7 md:before:h-px md:before:bg-[var(--border)] md:before:content-['']">
        {steps.map((step, index) => (
          <article
            key={step.title}
            className="group relative rounded-[var(--r)] border border-[var(--border)] bg-[var(--surface)] p-4 transition-all duration-200 hover:-translate-y-1 hover:border-[var(--accent)] hover:bg-[var(--accent-bg)] hover:shadow-md"
          >
            <span
              className="relative z-10 inline-flex h-14 w-14 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-base font-semibold text-[var(--muted)] transition-all duration-200 group-hover:border-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-white"
            >
              {index + 1}
            </span>
            <h3 className="mt-4 text-sm font-semibold text-[var(--text)] transition duration-200 group-hover:text-[var(--accent)]">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)] transition duration-200 group-hover:text-[var(--text)]">
              {step.description}
            </p>
          </article>
        ))}
      </div>
    </RevealOnScroll>
  );
}
