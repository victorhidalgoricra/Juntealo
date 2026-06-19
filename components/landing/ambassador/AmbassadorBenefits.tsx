import { Share2, UserCheck, TrendingUp } from 'lucide-react';
import { RevealOnScroll } from '@/components/landing/reveal';

const pillars = [
  {
    Icon: Share2,
    title: 'Conecta',
    description:
      'Presenta Juntealo a personas, grupos y comunidades que buscan una mejor forma de organizarse.',
  },
  {
    Icon: UserCheck,
    title: 'Acompaña',
    description:
      'Orienta a tu comunidad para que conozca la plataforma y pueda aprovecharla desde el inicio.',
  },
  {
    Icon: TrendingUp,
    title: 'Crece',
    description:
      'Tu avance dentro del programa evoluciona a medida que crece el impacto y la actividad de tu comunidad.',
  },
] as const;

export function AmbassadorBenefits() {
  return (
    <RevealOnScroll className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
        Ser embajador
      </p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text)]">
        Más que recomendar, ayudas a construir comunidad
      </h2>
      <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-[var(--muted)]">
        Un embajador conecta a más personas con Juntealo, las acompaña en sus primeros pasos y
        contribuye a que organicen sus juntas de manera más clara y digital.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {pillars.map(({ Icon, title, description }) => (
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
  );
}
