import { Heart, Sparkles, Users } from 'lucide-react';
import { RevealOnScroll } from '@/components/landing/reveal';

const ideas = [
  {
    Icon: Heart,
    text: 'Genera confianza.',
  },
  {
    Icon: Sparkles,
    text: 'Impulsa la organización.',
  },
  {
    Icon: Users,
    text: 'Construye una comunidad más fuerte.',
  },
] as const;

export function AmbassadorPurpose() {
  return (
    <RevealOnScroll className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <div className="rounded-[var(--r)] border border-[var(--border)] bg-[var(--surface)] p-6 md:grid md:grid-cols-2 md:gap-10 md:p-10">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold tracking-tight text-[var(--text)]">
            Crecer también es ayudar a otros a avanzar
          </h2>
          <p className="text-[17px] leading-relaxed text-[var(--muted)]">
            Juntealo busca que más personas puedan organizar sus juntas con claridad, confianza y
            menos complicaciones. Como embajador, puedes ser parte de ese cambio dentro de tu
            comunidad.
          </p>
        </div>

        <div className="mt-6 flex flex-col justify-center gap-5 md:mt-0">
          {ideas.map(({ Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <span
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-[var(--accent-bg)]"
                aria-hidden="true"
              >
                <Icon size={16} className="text-[var(--accent)]" />
              </span>
              <span className="text-[15px] font-medium text-[var(--text)]">{text}</span>
            </div>
          ))}
        </div>
      </div>
    </RevealOnScroll>
  );
}
