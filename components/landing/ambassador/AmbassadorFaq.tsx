import { ChevronDown } from 'lucide-react';
import { RevealOnScroll } from '@/components/landing/reveal';

const faqs = [
  {
    q: '¿Necesito tener una comunidad grande?',
    a: 'No. Puedes comenzar recomendando Juntealo dentro de tu círculo cercano, asociación, empresa o comunidad.',
  },
  {
    q: '¿Cómo se calculan los beneficios?',
    a: 'Se consideran los usuarios referidos que cumplen las condiciones de actividad establecidas para el programa.',
  },
  {
    q: '¿Cuándo recibiré más información?',
    a: 'Durante la sesión conocerás las condiciones, criterios de actividad, niveles y proceso de participación.',
  },
  {
    q: '¿La sesión tiene algún costo?',
    a: 'No. La sesión informativa tiene una duración aproximada de 30 minutos.',
  },
];

export function AmbassadorFaq() {
  return (
    <RevealOnScroll className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
        Preguntas frecuentes
      </p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text)]">Dudas frecuentes</h2>

      <div className="mt-8 divide-y divide-[var(--border)] rounded-[var(--r)] border border-[var(--border)]">
        {faqs.map((faq) => (
          <details key={faq.q} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[15px] font-medium text-[var(--text)] transition-colors hover:text-[var(--accent)] [&::-webkit-details-marker]:hidden">
              <span>{faq.q}</span>
              <ChevronDown
                size={16}
                aria-hidden="true"
                className="shrink-0 text-[var(--muted)] transition-transform duration-200 group-open:rotate-180"
              />
            </summary>
            <p className="px-5 pb-4 text-sm leading-relaxed text-[var(--muted)]">{faq.a}</p>
          </details>
        ))}
      </div>
    </RevealOnScroll>
  );
}
