import { RevealOnScroll } from '@/components/landing/reveal';

const profiles = [
  'Líderes de comunidades',
  'Organizadores de juntas',
  'Emprendedores',
  'Creadores de contenido financiero',
  'Personas que trabajan con asociaciones o grupos',
  'Usuarios que recomiendan Juntealo dentro de su entorno',
];

export function AmbassadorProfile() {
  return (
    <RevealOnScroll className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <h2 className="text-3xl font-bold tracking-tight text-[var(--text)]">
        Este programa puede ser para ti
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
