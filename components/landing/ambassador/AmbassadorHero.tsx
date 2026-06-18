import { Share2, UserCheck, Gift, ExternalLink } from 'lucide-react';
import { RevealOnScroll } from '@/components/landing/reveal';
import { AMBASSADOR_CALENDLY_URL } from './constants';

const demoStats = [
  ['Personas invitadas', '24'],
  ['Usuarios activos', '12'],
  ['Próximo nivel', '15 activos'],
] as const;

const demoAvatars = ['AL', 'MC', 'DR', 'VN', 'LP', 'RG'];

const concepts = [
  { Icon: Share2, text: 'Recomienda Juntealo.' },
  { Icon: UserCheck, text: 'Tus referidos empiezan a usar la plataforma.' },
  { Icon: Gift, text: 'Obtienes beneficios por usuarios activos.' },
] as const;

export function AmbassadorHero() {
  return (
    <RevealOnScroll className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 md:grid-cols-2 md:items-center md:px-6 md:py-16">
      <div className="space-y-6">
        <p className="inline-flex items-center rounded-full bg-[var(--accent-bg)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
          Programa de embajadores
        </p>

        <h1 className="break-words text-4xl font-bold leading-tight text-[var(--text)] md:text-5xl md:tracking-[-1.5px]">
          Sé <span className="text-[var(--accent)]">embajador</span> de Juntealo
        </h1>

        <p className="max-w-xl text-[17px] leading-relaxed text-[var(--muted)]">
          Ayuda a más personas a organizar sus juntas y obtén beneficios por cada usuario referido que se mantenga activo.
        </p>

        <div className="flex flex-wrap gap-3">
          <a
            href={AMBASSADOR_CALENDLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-[var(--r-sm)] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
          >
            Quiero ser embajador
            <ExternalLink size={14} aria-hidden="true" />
          </a>
          <a
            href="#beneficios"
            className="inline-flex rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--accent-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
          >
            Conocer los beneficios
          </a>
        </div>

        <div className="flex flex-col gap-2">
          {concepts.map(({ Icon, text }) => (
            <div key={text} className="flex items-start gap-2 text-sm text-[var(--muted)]">
              <Icon size={15} className="mt-0.5 shrink-0 text-[var(--accent)]" aria-hidden="true" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative rounded-[var(--r-xl)] bg-[var(--dark-1)] p-5 text-white shadow-xl sm:p-7">
        <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--dark-muted)]">Ejemplo ilustrativo</p>
        <h2 className="mt-2 text-xl font-semibold">Tu comunidad crece</h2>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {demoStats.map(([label, value]) => (
            <div key={label} className="rounded-[var(--r-sm)] bg-[var(--dark-3)] p-3">
              <p className="text-[11px] text-[var(--dark-muted)]">{label}</p>
              <p className="mt-1 font-mono text-sm font-semibold">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-[var(--dark-muted)]">
            <span>Progreso al siguiente nivel</span>
            <span>12 / 15</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-[var(--dark-4)]">
            <div className="h-1.5 rounded-full bg-[var(--accent-light)]" style={{ width: '80%' }} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {demoAvatars.map((initials) => (
            <span
              key={initials}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--dark-4)] text-[11px] font-semibold"
            >
              {initials}
            </span>
          ))}
          <span className="inline-flex h-8 items-center justify-center rounded-full border border-[var(--dark-4)] px-3 text-xs text-[var(--dark-text)]">
            +6
          </span>
        </div>
      </div>
    </RevealOnScroll>
  );
}
