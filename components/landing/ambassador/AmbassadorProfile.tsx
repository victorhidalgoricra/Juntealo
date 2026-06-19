import { RevealOnScroll } from '@/components/landing/reveal';

const profiles = [
  'Organizas o participas en juntas.',
  'Lideras una comunidad.',
  'Trabajas con asociaciones o grupos.',
  'Creas contenido sobre finanzas u organización.',
  'Tienes contacto con emprendedores.',
  'Disfrutas recomendando soluciones útiles.',
  'Quieres crecer ayudando a otras personas.',
];

export function AmbassadorProfile() {
  return (
    <RevealOnScroll className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
        Perfil
      </p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text)]">
        Puedes ser embajador de Juntealo si…
      </h2>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {profiles.map((profile) => (
          <div
            key={profile}
            className="flex items-center gap-3 rounded-[var(--r)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
          >
            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" aria-hidden="true" />
            <span className="text-sm text-[var(--text)]">{profile}</span>
          </div>
        ))}
      </div>
    </RevealOnScroll>
  );
}
