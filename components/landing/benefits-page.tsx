import Link from 'next/link';
import {
  Shield,
  TrendingUp,
  Star,
  Target,
  Award,
  CheckCircle2,
  Clock,
  Users,
  Zap,
  MessageSquare,
  ArrowRight,
  Trophy,
  BadgeCheck,
} from 'lucide-react';
import { RevealOnScroll } from './reveal';

// ─── Static demo data (no real user data) ────────────────────────────────────

const LEVELS = [
  {
    name: 'Nuevo',
    range: '0–29 pts',
    color: 'bg-slate-100 border-slate-200',
    badge: 'text-slate-600 bg-slate-100',
    dot: 'bg-slate-400',
    maxMembers: 8,
    maxRound: 400,
    incentives: false,
    priorityVisibility: false,
    trustedBadge: false,
    signal: 'Inicial',
  },
  {
    name: 'Bronce',
    range: '30–49 pts',
    color: 'bg-amber-50 border-amber-200',
    badge: 'text-amber-700 bg-amber-100',
    dot: 'bg-amber-500',
    maxMembers: 12,
    maxRound: 700,
    incentives: false,
    priorityVisibility: false,
    trustedBadge: false,
    signal: 'Estable',
  },
  {
    name: 'Plata',
    range: '50–69 pts',
    color: 'bg-slate-50 border-slate-300',
    badge: 'text-slate-700 bg-slate-200',
    dot: 'bg-slate-500',
    maxMembers: 18,
    maxRound: 1200,
    incentives: true,
    priorityVisibility: false,
    trustedBadge: true,
    signal: 'Confiable',
  },
  {
    name: 'Oro',
    range: '70–84 pts',
    color: 'bg-yellow-50 border-yellow-300',
    badge: 'text-yellow-700 bg-yellow-100',
    dot: 'bg-yellow-500',
    maxMembers: 25,
    maxRound: 2000,
    incentives: true,
    priorityVisibility: true,
    trustedBadge: true,
    signal: 'Avanzado',
  },
  {
    name: 'Élite',
    range: '85–100 pts',
    color: 'bg-[var(--accent-bg)] border-[var(--accent)]',
    badge: 'text-[var(--accent)] bg-[var(--accent-bg)]',
    dot: 'bg-[var(--accent)]',
    maxMembers: 40,
    maxRound: 3500,
    incentives: true,
    priorityVisibility: true,
    trustedBadge: true,
    signal: 'Top confianza',
  },
] as const;

const DEMO_RANKING = [
  { initials: 'ML', name: 'María L.', level: 'Élite', score: 92, onTime: 24, cycles: 3, badge: true },
  { initials: 'CR', name: 'Carlos R.', level: 'Oro', score: 78, onTime: 18, cycles: 2, badge: true },
  { initials: 'AT', name: 'Ana T.', level: 'Oro', score: 74, onTime: 16, cycles: 2, badge: true },
  { initials: 'JP', name: 'José P.', level: 'Plata', score: 61, onTime: 12, cycles: 1, badge: true },
  { initials: 'LV', name: 'Luisa V.', level: 'Plata', score: 55, onTime: 10, cycles: 1, badge: false },
];

const LEVEL_BADGE_CLASSES: Record<string, string> = {
  Élite: 'text-[var(--accent)] bg-[var(--accent-bg)]',
  Oro: 'text-yellow-700 bg-yellow-100',
  Plata: 'text-slate-700 bg-slate-200',
  Bronce: 'text-amber-700 bg-amber-100',
  Nuevo: 'text-slate-600 bg-slate-100',
};

const MISSIONS = [
  {
    id: 'pay_on_time',
    icon: Clock,
    title: 'Paga a tiempo esta semana',
    desc: 'Confirma tu cuota antes del vencimiento.',
    points: 3,
    progress: 0,
    total: 1,
    colorClass: 'text-[var(--green)]',
    bgClass: 'bg-[var(--green-bg)]',
  },
  {
    id: 'complete_cycle',
    icon: CheckCircle2,
    title: 'Completa tu ciclo actual',
    desc: 'Termina una junta activa sin atrasos.',
    points: 8,
    progress: 0,
    total: 1,
    colorClass: 'text-[var(--accent)]',
    bgClass: 'bg-[var(--accent-bg)]',
  },
  {
    id: 'refer_member',
    icon: Users,
    title: 'Refiere 1 miembro activo',
    desc: 'Invita a alguien que se una y participe.',
    points: 5,
    progress: 0,
    total: 1,
    colorClass: 'text-[var(--accent-light)]',
    bgClass: 'bg-[var(--accent-bg)]',
  },
  {
    id: 'streak_4',
    icon: Zap,
    title: 'Mantén 4 rondas puntuales',
    desc: 'Pagos puntuales en 4 rondas consecutivas.',
    points: 6,
    progress: 2,
    total: 4,
    colorClass: 'text-[var(--amber)]',
    bgClass: 'bg-[var(--amber-bg)]',
  },
];

const WHAT_YOU_BUILD = [
  {
    icon: TrendingUp,
    title: 'Historial de pagos',
    desc: 'Cada cuota registrada queda en tu perfil. Nadie puede borrarla ni negarla.',
    bg: 'bg-[var(--green-bg)]',
    iconColor: 'text-[var(--green)]',
  },
  {
    icon: Shield,
    title: 'Score de confianza',
    desc: 'Un número que refleja tu puntualidad, ciclos completados y constancia a lo largo del tiempo.',
    bg: 'bg-[var(--accent-bg)]',
    iconColor: 'text-[var(--accent)]',
  },
  {
    icon: Trophy,
    title: 'Ranking de buenos pagadores',
    desc: 'Tu posición frente al grupo. Visible para quienes administran juntas.',
    bg: 'bg-yellow-50',
    iconColor: 'text-yellow-600',
  },
  {
    icon: Target,
    title: 'Misiones y puntos',
    desc: 'Retos semanales que premian la disciplina y la consistencia con puntos de score.',
    bg: 'bg-[var(--amber-bg)]',
    iconColor: 'text-[var(--amber)]',
  },
  {
    icon: Award,
    title: 'Badges y niveles',
    desc: 'Cinco niveles que desbloquean mayor capacidad, montos y privilegios dentro de la plataforma.',
    bg: 'bg-slate-100',
    iconColor: 'text-slate-600',
  },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function ScoreDemoCard() {
  return (
    <div className="relative overflow-hidden rounded-[var(--r-xl)] bg-[var(--dark-1)] p-5 text-white shadow-xl sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--dark-muted)]">Tu perfil demo</p>
          <p className="mt-1 text-sm font-medium text-[var(--dark-text)]">María L.</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-semibold text-yellow-300">
          <Star className="h-3 w-3 fill-current" /> Oro
        </span>
      </div>

      <div className="mt-5 flex items-end gap-2">
        <span className="font-mono text-5xl font-bold leading-none">86</span>
        <span className="mb-1 text-lg text-[var(--dark-muted)]">/ 100</span>
      </div>
      <p className="mt-1 text-xs text-[var(--dark-muted)]">Score de confianza Juntealo</p>

      <div className="mt-5">
        <div className="flex flex-col gap-1 text-[11px] text-[var(--dark-muted)] sm:flex-row sm:justify-between">
          <span>Nivel Oro</span>
          <span>Élite en 14 pts</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--dark-4)]">
          <div className="h-2 rounded-full bg-[var(--accent-light)]" style={{ width: '73%' }} />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {[
          ['Pagos puntuales', '18'],
          ['Ciclos completados', '2'],
          ['Racha activa', '6 sem'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[var(--r-sm)] bg-[var(--dark-3)] p-2.5">
            <p className="text-[10px] leading-tight text-[var(--dark-muted)]">{label}</p>
            <p className="mt-1 font-mono text-sm font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <BadgeCheck className="h-4 w-4 text-[var(--accent-light)]" />
        <span className="text-xs text-[var(--dark-text)]">Badge de confianza activo</span>
      </div>
    </div>
  );
}

function LevelCard({ level, index }: { level: (typeof LEVELS)[number]; index: number }) {
  const isElite = level.name === 'Élite';
  return (
    <article className={`rounded-[var(--r)] border p-5 ${level.color} ${isElite ? 'ring-2 ring-[var(--accent)]/30' : ''}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${level.dot}`} />
          <span className="break-words text-[15px] font-semibold text-[var(--text)]">{level.name}</span>
        </div>
        {isElite && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold text-white">
            <Star className="h-2.5 w-2.5 fill-current" /> Top
          </span>
        )}
      </div>
      <p className="mt-1 text-[11px] text-[var(--muted)]">{level.range}</p>

      <ul className="mt-4 space-y-1.5 text-[13px] text-[var(--text)]">
        <li className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
          Hasta <strong>{level.maxMembers} integrantes</strong>
        </li>
        <li className="flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
          Hasta <strong>S/ {level.maxRound.toLocaleString('es-PE')} / ronda</strong>
        </li>
        {level.trustedBadge && (
          <li className="flex items-center gap-2 text-[var(--accent)]">
            <BadgeCheck className="h-3.5 w-3.5 shrink-0" />
            Badge de confianza
          </li>
        )}
        {level.incentives && (
          <li className="flex items-center gap-2 text-[var(--green)]">
            <Zap className="h-3.5 w-3.5 shrink-0" />
            Juntas con incentivos
          </li>
        )}
        {level.priorityVisibility && (
          <li className="flex items-center gap-2 text-[var(--amber)]">
            <Star className="h-3.5 w-3.5 shrink-0" />
            Visibilidad prioritaria
          </li>
        )}
      </ul>

      <div className="mt-4 text-[11px]">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${level.badge}`}>
          {level.signal}
        </span>
      </div>
    </article>
  );
}

// ─── Main page component ─────────────────────────────────────────────────────

export function BenefitsPage() {
  return (
    <main>
        {/* ── Hero ── */}
        <RevealOnScroll className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 md:grid-cols-2 md:items-center md:px-6 md:py-20">
          <div className="space-y-6">
            <p className="inline-flex items-center rounded-full bg-[var(--green-bg)] px-3 py-1 text-xs font-semibold text-[var(--green)]">
              ● Tu buena conducta en Juntealo no se pierde
            </p>

            <h1 className="break-words text-4xl font-bold leading-tight text-[var(--text)] md:text-5xl">
              Haz que pagar puntual{' '}
              <span className="text-[var(--accent)]">valga más</span>{' '}
              que un mensaje en WhatsApp
            </h1>

            <p className="max-w-xl text-[17px] leading-relaxed text-[var(--muted)]">
              Juntealo registra cumplimiento, ciclos y constancia para construir reputación dentro de la plataforma. Lo que antes se perdía en chats, ahora queda en tu historial.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-[var(--r-sm)] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-dark)]"
              >
                Crear mi cuenta <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/explorar"
                className="inline-flex rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--accent-bg)]"
              >
                Explorar juntas
              </Link>
            </div>
          </div>

          <ScoreDemoCard />
        </RevealOnScroll>

        {/* ── Lo que construyes ── */}
        <RevealOnScroll className="bg-[var(--surface)]">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[var(--text)]">
                Lo que construyes al participar
              </h2>
              <p className="mt-3 text-[15px] text-[var(--muted)]">
                Cada junta deja una huella visible en tu perfil.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {WHAT_YOU_BUILD.map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className={`rounded-[var(--r)] border border-[var(--border)] p-5 ${item.bg}`}
                  >
                    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-[var(--r-sm)] bg-white/70 ${item.iconColor}`}>
                      <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
                    </span>
                    <h3 className="mt-4 text-[14px] font-semibold text-[var(--text)]">{item.title}</h3>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--muted)]">{item.desc}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </RevealOnScroll>

        {/* ── Niveles ── */}
        <RevealOnScroll className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[var(--text)]">
              Cinco niveles, más posibilidades
            </h2>
            <p className="mt-3 max-w-xl mx-auto text-[15px] text-[var(--muted)]">
              Conforme crece tu historial, crece también tu capacidad dentro de Juntealo. Cada nivel desbloquea integrantes, montos y beneficios reales.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {LEVELS.map((level, i) => (
              <LevelCard key={level.name} level={level} index={i} />
            ))}
          </div>

          <p className="mt-5 text-center text-[12px] text-[var(--muted)]">
            Los beneficios aplican dentro de Juntealo. No constituyen productos financieros externos.
          </p>
        </RevealOnScroll>

        {/* ── Ranking demo ── */}
        <RevealOnScroll className="bg-[var(--surface)]">
          <div className="mx-auto w-full max-w-4xl px-4 py-12 md:px-6 md:py-16">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[var(--text)]">
                Así se ve la reputación en Juntealo
              </h2>
              <p className="mt-3 text-[15px] text-[var(--muted)]">
                Ejemplo ilustrativo con datos ficticios. Así lucirá tu perfil frente al grupo cuando construyas historial.
              </p>
            </div>

            <div className="mt-8 overflow-x-auto rounded-[var(--r)] border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg)]">
                  <tr className="border-b border-[var(--border)]">
                    <th className="py-3 pl-4 pr-2 text-left text-[12px] font-semibold uppercase tracking-wide text-[var(--muted)]">#</th>
                    <th className="px-2 py-3 text-left text-[12px] font-semibold uppercase tracking-wide text-[var(--muted)]">Miembro</th>
                    <th className="px-2 py-3 text-center text-[12px] font-semibold uppercase tracking-wide text-[var(--muted)]">Score</th>
                    <th className="px-2 py-3 text-center text-[12px] font-semibold uppercase tracking-wide text-[var(--muted)] hidden sm:table-cell">Puntuales</th>
                    <th className="px-2 py-3 text-center text-[12px] font-semibold uppercase tracking-wide text-[var(--muted)] hidden sm:table-cell">Ciclos</th>
                    <th className="px-2 py-3 text-center text-[12px] font-semibold uppercase tracking-wide text-[var(--muted)]">Nivel</th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO_RANKING.map((row, i) => (
                    <tr key={row.name} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg)] transition-colors">
                      <td className="py-3.5 pl-4 pr-2 font-mono text-[13px] text-[var(--muted)]">{i + 1}</td>
                      <td className="px-2 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-bg)] text-[11px] font-semibold text-[var(--accent)]">
                            {row.initials}
                          </span>
                          <div className="min-w-0">
                            <p className="break-words text-[13px] font-medium text-[var(--text)]">{row.name}</p>
                            {row.badge && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-[var(--accent)]">
                                <BadgeCheck className="h-3 w-3" /> Confiable
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3.5 text-center font-mono text-[14px] font-bold text-[var(--text)]">{row.score}</td>
                      <td className="px-2 py-3.5 text-center text-[13px] text-[var(--muted)] hidden sm:table-cell">{row.onTime}</td>
                      <td className="px-2 py-3.5 text-center text-[13px] text-[var(--muted)] hidden sm:table-cell">{row.cycles}</td>
                      <td className="px-2 py-3.5 text-center">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${LEVEL_BADGE_CLASSES[row.level]}`}>
                          {row.level}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-center text-[12px] text-[var(--muted)]">
              * Datos de ejemplo. Los nombres y cifras son ficticios para ilustrar cómo funciona la reputación dentro de Juntealo.
            </p>
          </div>
        </RevealOnScroll>

        {/* ── Misiones ── */}
        <RevealOnScroll className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[var(--text)]">
              Misiones que premian la disciplina
            </h2>
            <p className="mt-3 text-[15px] text-[var(--muted)]">
              Cada semana hay retos concretos. Completarlos suma puntos directamente a tu score.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {MISSIONS.map((mission) => {
              const Icon = mission.icon;
              const pct = Math.round((mission.progress / mission.total) * 100);
              return (
                <article
                  key={mission.id}
                  className="rounded-[var(--r)] border border-[var(--border)] bg-[var(--surface)] p-5"
                >
                  <div className="flex items-start gap-3">
                    <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] ${mission.bgClass} ${mission.colorClass}`}>
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-[14px] font-semibold text-[var(--text)]">{mission.title}</h3>
                        <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${mission.bgClass} ${mission.colorClass}`}>
                          +{mission.points} pts
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] text-[var(--muted)]">{mission.desc}</p>
                      <div className="mt-3">
                        <div className="flex justify-between text-[11px] text-[var(--muted)]">
                          <span>{mission.progress}/{mission.total}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--bg)]">
                          <div
                            className={`h-1.5 rounded-full transition-[width] duration-500 ${mission.bgClass.replace('bg-', 'bg-').replace('-bg', '')}`}
                            style={{ width: `${pct || 4}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </RevealOnScroll>

        {/* ── Por qué importa ── */}
        <RevealOnScroll className="bg-[var(--surface)]">
          <div className="mx-auto w-full max-w-5xl px-4 py-12 md:px-6 md:py-16">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[var(--text)]">
                Por qué esto importa
              </h2>
              <p className="mt-3 text-[15px] text-[var(--muted)]">
                La diferencia entre un grupo que confía y uno que duda.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {/* Sin Juntealo */}
              <div className="rounded-[var(--r)] border border-[var(--destructive-bg)] bg-[var(--destructive-bg)]/40 p-6">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-[var(--destructive)]" />
                  <h3 className="text-[15px] font-semibold text-[var(--destructive)]">Sin Juntealo</h3>
                </div>
                <ul className="mt-4 space-y-3 text-[13px] text-[var(--text)]">
                  {[
                    'Los pagos se acuerdan por WhatsApp y nadie lleva registro.',
                    'Cuando alguien falla, no hay forma de demostrarlo con evidencia.',
                    'El historial se pierde al cambiar de grupo o de número.',
                    'La confianza depende solo de la palabra de cada quien.',
                    'Los mejores pagadores no tienen forma de diferenciarse.',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0 text-[var(--destructive)]">✕</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Con Juntealo */}
              <div className="rounded-[var(--r)] border border-[var(--green-bg)] bg-[var(--green-bg)]/40 p-6">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-[var(--green)]" />
                  <h3 className="text-[15px] font-semibold text-[var(--green)]">Con Juntealo</h3>
                </div>
                <ul className="mt-4 space-y-3 text-[13px] text-[var(--text)]">
                  {[
                    'Cada pago queda registrado con fecha y confirmación.',
                    'Tu historial de cumplimiento es verificable dentro de la plataforma.',
                    'El score acompaña tu perfil en todas las juntas donde participas.',
                    'Los organizadores pueden evaluar confianza con datos reales.',
                    'Quienes pagan bien acceden a juntas más grandes y mejores condiciones.',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0 text-[var(--green)]">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="mt-6 rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-center text-[13px] text-[var(--muted)]">
              El historial de Juntealo es una señal de confianza <em>dentro de la plataforma</em>. Puede ayudarte a demostrar cumplimiento ante otros grupos y organizadores, pero no constituye un reporte financiero externo ni garantiza inclusión financiera.
            </p>
          </div>
        </RevealOnScroll>

        {/* ── CTA Final ── */}
        <RevealOnScroll className="bg-[var(--dark-1)]">
          <div className="mx-auto w-full max-w-4xl px-4 py-16 text-center md:py-[72px]">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              Empieza a construir tu historial de junta
            </h2>
            <p className="mt-3 text-sm text-[var(--dark-text)] md:text-base">
              Tu buena conducta en una junta deja de perderse en WhatsApp y empieza a construir confianza.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-[var(--r-sm)] bg-white px-5 py-3 text-sm font-semibold text-[var(--dark-1)] transition hover:bg-[var(--faint)]"
              >
                Crear mi cuenta <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/explorar"
                className="inline-flex rounded-[var(--r-sm)] border border-[var(--dark-4)] px-5 py-3 text-sm font-semibold text-[var(--dark-text)] transition hover:bg-[var(--dark-3)]"
              >
                Explorar juntas
              </Link>
            </div>
          </div>
        </RevealOnScroll>
    </main>
  );
}
