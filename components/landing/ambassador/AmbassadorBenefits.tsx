import { Award, TrendingUp, Trophy, Zap } from 'lucide-react';
import { RevealOnScroll } from '@/components/landing/reveal';

const benefits = [
  {
    Icon: Award,
    title: 'Beneficios por usuario activo',
    description:
      'Obtén beneficios por cada referido que cumpla las condiciones de actividad del programa.',
  },
  {
    Icon: TrendingUp,
    title: 'Crecimiento recurrente',
    description:
      'Mientras más usuarios activos mantenga tu comunidad, mayores podrán ser tus beneficios.',
  },
  {
    Icon: Trophy,
    title: 'Bonos por desempeño',
    description:
      'Accede a incentivos adicionales al alcanzar determinados niveles de usuarios activos.',
  },
  {
    Icon: Zap,
    title: 'Recursos para crecer',
    description:
      'Recibe materiales, orientación y recursos para presentar Juntealo a tu comunidad.',
  },
] as const;

export function AmbassadorBenefits() {
  return (
    <div id="beneficios" className="scroll-mt-20">
      <RevealOnScroll className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
          Beneficios
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text)]">
          Gana mientras ayudas a crecer a tu comunidad
        </h2>
        <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-[var(--muted)]">
          El programa reconoce a los embajadores que ayudan a más personas a organizar sus finanzas
          en grupo de manera clara y digital.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map(({ Icon, title, description }) => (
            <article
              key={title}
              className="rounded-[var(--r)] border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--r-sm)] bg-[var(--accent-bg)]">
                <Icon size={18} className="text-[var(--accent)]" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold text-[var(--text)]">{title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">{description}</p>
            </article>
          ))}
        </div>
      </RevealOnScroll>
    </div>
  );
}
