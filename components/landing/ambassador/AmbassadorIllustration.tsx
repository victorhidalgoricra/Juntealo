import { Check, Gift } from 'lucide-react';

const impactBlocks = [
  {
    label: 'Tu comunidad',
    value: 'Más personas activas',
    detail: 'Conectadas por ti'
  },
  {
    label: 'Tu crecimiento',
    value: 'Nuevas oportunidades',
    detail: 'Según tu impacto'
  }
];

const journeySteps = [
  { label: 'Compartes', status: 'Completado' },
  { label: 'Activas', status: 'Completado' },
  { label: 'Creces', status: 'En progreso' }
];

const communityMembers = ['AL', 'MC', 'DR', 'VN'];

export function AmbassadorIllustration() {
  return (
    <section
      aria-label="Resumen visual del programa de embajadores"
      className="relative overflow-hidden rounded-[var(--r-xl)] bg-[var(--dark-1)] p-5 text-white shadow-xl sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--dark-muted)]">
            Programa de Embajadores
          </p>
          <h2 className="mt-1.5 max-w-sm break-words text-xl font-semibold leading-[1.15]">
            Tu impacto abre nuevas oportunidades
          </h2>
          <p className="mt-1 text-sm text-[var(--dark-muted)]">Crece junto a tu comunidad</p>
        </div>

        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--green-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--green)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)]" aria-hidden="true" />
          En crecimiento
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {impactBlocks.map((block) => (
          <div key={block.label} className="rounded-[var(--r-sm)] bg-[var(--dark-3)] p-2.5">
            <p className="text-[11px] text-[var(--dark-muted)]">{block.label}</p>
            <p className="mt-1 text-sm font-semibold leading-snug text-white">{block.value}</p>
            <p className="mt-0.5 text-[11px] text-[var(--dark-text)]">{block.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-[var(--r-sm)] bg-[var(--dark-3)] p-2.5">
        <div className="relative px-1 pt-1">
          <div
            className="absolute left-5 right-5 top-[13px] h-1 rounded-full bg-[var(--dark-4)]"
            aria-hidden="true"
          >
            <div className="h-1 w-2/3 rounded-full bg-[var(--accent)]" />
          </div>

          <ol className="relative grid grid-cols-3 gap-3">
            {journeySteps.map((step, index) => {
              const isComplete = step.status === 'Completado';

              return (
                <li key={step.label} className="flex min-w-0 flex-col items-center text-center">
                  <span
                    className={[
                      'z-10 inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold',
                      isComplete
                        ? 'border-[var(--green)] bg-[var(--green)] text-white'
                        : 'border-[var(--accent)] bg-[var(--dark-1)] text-[var(--accent)]'
                    ].join(' ')}
                    aria-hidden="true"
                  >
                    {isComplete ? <Check size={11} strokeWidth={2.5} /> : index + 1}
                  </span>
                  <span className="mt-2 text-xs font-semibold text-white">{step.label}</span>
                  <span className="mt-1 text-[11px] text-[var(--dark-muted)]">{step.status}</span>
                </li>
              );
            })}
          </ol>
        </div>

        <p className="mt-3 text-center text-xs font-medium text-[var(--dark-text)]">
          Tu comunidad avanza contigo
        </p>
      </div>

      <div className="mt-3 flex flex-col gap-3 rounded-[var(--r-sm)] border border-[color:rgb(45_91_227_/_0.28)] bg-[color:rgb(45_91_227_/_0.12)] p-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white"
            aria-hidden="true"
          >
            <Gift size={15} strokeWidth={2.2} />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Beneficio en crecimiento</p>
            <p className="mt-0.5 text-xs leading-snug text-[var(--dark-text)]">
              Conoce los detalles en una sesión personal
            </p>
          </div>
        </div>

        <div className="flex -space-x-1.5" aria-label="Comunidad representada por iniciales">
          {communityMembers.map((member, index) => (
            <span
              key={member}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--dark-1)] bg-[var(--dark-4)] text-[10px] font-semibold text-[var(--dark-text)]"
              style={{ zIndex: communityMembers.length - index }}
            >
              {member}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
