'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { RevealOnScroll } from './reveal';
import { calcSimulador } from '@/lib/junta-calc';
import type { TipoJunta, Frecuencia } from '@/lib/junta-calc';
import { DarkHeroCard } from './dark-hero-card';

const HERO_PERSONAS = 5;
const HERO_FRECUENCIA: Frecuencia = 'Semanal';
const HERO_MIN_AMOUNT = 100;
const HERO_MAX_AMOUNT = 10_000;

const normalFeatures = [
  { icon: '📊', title: 'Panel del grupo', desc: 'Todos ven el estado en tiempo real: quién pagó, quién falta y el turno activo.', accentBg: 'var(--accent-bg)' },
  { icon: '🔔', title: 'Recordatorios automáticos', desc: 'La plataforma avisa a cada integrante cuando se acerca su fecha de pago.', accentBg: 'var(--accent-bg)' },
  { icon: '🛡️', title: 'Score de confianza', desc: 'Cada integrante acumula puntaje según su historial. Transparente para todos.', accentBg: 'var(--green-bg)' },
  { icon: '🔄', title: 'Turnos automáticos', desc: 'El sistema gestiona el orden y confirma quién cobra en cada período.', accentBg: 'var(--green-bg)' },
];

const incentivosFeatures = [
  {
    icon: '💸',
    title: 'Recibe antes',
    desc: 'Quienes toman los primeros turnos acceden al dinero antes, cuando más lo necesitan.',
    accentBg: 'var(--accent-bg)',
  },
  {
    icon: '📉',
    title: 'Pagas menos si cobras después',
    desc: 'Los últimos turnos reciben la misma bolsa, pero con cuotas más bajas durante todo el ciclo.',
    accentBg: 'var(--green-bg)',
  },
  {
    icon: '⚖️',
    title: 'Sistema equilibrado',
    desc: 'El grupo se balancea automáticamente para que todos reciban exactamente la misma bolsa de dinero.',
    accentBg: 'var(--accent-bg)',
  },
  {
    icon: '🤝',
    title: 'Ideal para grupos nuevos',
    desc: 'Personas con distintas necesidades pueden participar sin depender de confianza total previa.',
    accentBg: 'var(--green-bg)',
  },
];

const faqs = [
  {
    q: '¿Qué pasa si alguien no paga?',
    a: 'La plataforma registra la mora y notifica al grupo y al organizador. El organizador decide cómo manejar la situación. En juntas con incentivos, el grupo ya acordó desde el inicio las condiciones de participación.',
  },
  {
    q: '¿El dinero pasa por Juntealo?',
    a: 'No. Los pagos son directamente entre integrantes por Yape, Plin o transferencia bancaria. Juntealo solo lleva el registro de pagos confirmados, gestiona los turnos y envía los recordatorios. Nunca tocamos tu dinero.',
  },
  {
    q: '¿Cómo funcionan exactamente los incentivos?',
    a: 'En una junta con incentivos, los integrantes que reciben el turno antes pagan una cuota ligeramente mayor por período, y los que reciben después pagan menos. No son intereses ni penalidades — es un acuerdo que el grupo define desde el inicio. La bolsa que cobra cada quien es la misma.',
  },
  {
    q: '¿Cómo se asignan los turnos?',
    a: 'El organizador puede asignarlos manualmente o sortearlos al azar antes de empezar. Una vez iniciada la junta los turnos son fijos, salvo acuerdo del grupo.',
  },
  {
    q: '¿Necesito instalar una app?',
    a: 'No. Juntealo funciona en el navegador de tu celular o computadora. Sin descargas.',
  },
  {
    q: '¿Cuánto cuesta?',
    a: 'Crear y gestionar una junta es gratis. Sin comisiones sobre los pagos del grupo.',
  },
];

export function ComoFuncionaPage() {
  const [activeProcessStep, setActiveProcessStep] = useState(0);
  const [hoveredProcessStep, setHoveredProcessStep] = useState<number | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [tipoActivo, setTipoActivo] = useState<TipoJunta>('normal');
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  // Hero mini simulator — solo cuota es ajustable; personas y frecuencia son fijos
  const [heroCuota, setHeroCuota] = useState(400);
  const [heroAmountInput, setHeroAmountInput] = useState('2000');
  const [heroEditing, setHeroEditing] = useState(false);

  // Simulador completo
  const [personas, setPersonas] = useState(5);
  const [cuota, setCuota] = useState(400);
  const [frecuencia, setFrecuencia] = useState<Frecuencia>('Semanal');
  const [simTipo, setSimTipo] = useState<TipoJunta>('normal');
  const [turnoActivo, setTurnoActivo] = useState(1);

  useEffect(() => {
    setTurnoActivo((prev) => Math.min(prev, personas));
  }, [personas]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updateMotionPreference();
    mediaQuery.addEventListener('change', updateMotionPreference);

    return () => mediaQuery.removeEventListener('change', updateMotionPreference);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion || hoveredProcessStep !== null) return;

    const intervalId = window.setInterval(() => {
      setActiveProcessStep((currentStep) => (currentStep + 1) % 4);
    }, 2500);

    return () => window.clearInterval(intervalId);
  }, [hoveredProcessStep, prefersReducedMotion]);

  const visibleProcessStep = hoveredProcessStep ?? (prefersReducedMotion ? 0 : activeProcessStep);

  // Cálculo compartido: hero mini
  const hero = calcSimulador(heroCuota, HERO_PERSONAS, HERO_FRECUENCIA);

  const setHeroAmount = (amount: number) => {
    const clampedAmount = Math.min(HERO_MAX_AMOUNT, Math.max(HERO_MIN_AMOUNT, amount));
    setHeroCuota(clampedAmount / HERO_PERSONAS);
    setHeroAmountInput(String(clampedAmount));
  };

  const commitHeroAmountInput = () => {
    const parsedAmount = Number(heroAmountInput);
    setHeroAmount(Number.isFinite(parsedAmount) ? parsedAmount : hero.bolsa);
  };

  // Cálculo compartido: simulador completo
  const sim = calcSimulador(cuota, personas, frecuencia);
  const cuotaDelTurno = sim.turnosCuota[turnoActivo - 1] ?? cuota;

  const turnColor = (i: number) => {
    const num = i + 1;
    if (num < turnoActivo) return 'bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]';
    if (num === turnoActivo) return 'bg-[var(--dark-1)] text-white';
    return 'bg-[var(--border)] text-[var(--muted)]';
  };

  return (
    <main className="flex flex-col">
      {/* ── 1. HERO ── */}
      <RevealOnScroll className="order-1 mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:items-center md:gap-12">
          {/* Columna izquierda — texto */}
          <div className="space-y-5">
            <span className="inline-flex items-center rounded-full bg-[var(--green-bg)] px-3 py-1 text-xs font-semibold text-[var(--green)]">
              ¿Cómo funciona?
            </span>
            <h1 className="break-words text-4xl font-bold leading-tight text-[var(--text)] md:text-5xl">
              ¿Cuánto dinero <span className="text-[var(--accent)]">quieres recibir?</span>
            </h1>
            <p className="text-[17px] leading-relaxed text-[var(--muted)]">
              Mueve el slider y ve al instante cuánto cobrarías y cuánto aportarías cada semana. Cuando quieras afinar tu grupo, el simulador completo está más abajo.
            </p>
          </div>

          {/* Columna derecha — mini simulador */}
          <DarkHeroCard>
            <label htmlFor="hero-amount" className="text-xs font-semibold text-[var(--dark-text)]">
              Monto que quieres recibir
            </label>
            <div className="mt-2 rounded-[var(--r-md)] bg-accent p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/70">
                Recibirás en tu turno
              </p>
              <div className="flex items-baseline break-all font-mono text-3xl font-bold text-white">
                <span>S/&nbsp;</span>
                <input
                  id="hero-amount"
                  type="text"
                  inputMode="numeric"
                  value={heroEditing ? heroAmountInput : hero.bolsa.toLocaleString('es-PE')}
                  onFocus={() => {
                    setHeroEditing(true);
                    setHeroAmountInput(String(hero.bolsa));
                  }}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setHeroAmountInput(nextValue);
                    const parsedValue = Number(nextValue);
                    if (nextValue !== '' && parsedValue >= HERO_MIN_AMOUNT && parsedValue <= HERO_MAX_AMOUNT) {
                      setHeroCuota(parsedValue / HERO_PERSONAS);
                    }
                  }}
                  onBlur={() => {
                    setHeroEditing(false);
                    commitHeroAmountInput();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur();
                  }}
                  aria-label="Monto que quieres recibir en soles"
                  className="min-w-0 flex-1 bg-transparent outline-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
              <p className="mt-0.5 text-xs text-white/60">
                Con {HERO_PERSONAS} personas · {HERO_FRECUENCIA}
              </p>
            </div>
            <input
              type="range"
              min={20}
              max={2000}
              step={10}
              value={heroCuota}
              onChange={(event) => setHeroAmount(+event.target.value * HERO_PERSONAS)}
              aria-label="Monto que quieres recibir"
              className="mt-3 w-full accent-[var(--accent)]"
            />
            <div className="mt-1 flex justify-between text-[11px] text-[var(--dark-muted)]">
              <span>S/ 100</span>
              <span>S/ 10,000</span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: 'Bolsa por turno', value: `S/ ${hero.bolsa.toLocaleString('es-PE')}` },
                { label: 'Cuota por semana', value: `S/ ${heroCuota.toLocaleString('es-PE')}` },
                { label: 'Duración', value: hero.duracionLabel },
              ].map((item) => (
                <div key={item.label} className="rounded-[var(--r-sm)] bg-[var(--dark-3)] p-3">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--dark-muted)]">{item.label}</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>

            <a
              href="#simulador"
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)] transition-opacity hover:opacity-75"
            >
              Personalizar más →
            </a>
          </DarkHeroCard>
        </div>
      </RevealOnScroll>

      {/* ── 2. PROCESO ── */}
      <RevealOnScroll className="order-2 mx-auto w-full max-w-5xl px-4 py-14 md:px-6 md:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">El proceso</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">4 pasos para crear una junta</h2>

        <div className="relative mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-6 md:before:absolute md:before:left-10 md:before:right-10 md:before:top-7 md:before:h-px md:before:bg-[var(--border)] md:before:content-['']">
          {[
            {
              num: 1,
              title: 'Crea tu junta',
              body: 'Define integrantes, cuota, frecuencia, modalidad y elige si será pública o privada.',
            },
            {
              num: 2,
              title: 'Completa tu grupo',
              body: 'Espera a que se llenen los cupos para iniciar la junta.',
            },
            {
              num: 3,
              title: 'Todos aportan',
              body: (
                <>
                  Cada integrante paga al receptor del turno.{' '}
                  <strong>Juntealo registra los pagos y envía recordatorios.</strong>
                </>
              ),
            },
            {
              num: 4,
              title: 'El turno cobra',
              body: 'Cuando se completan los aportes, quien tiene el turno recibe la bolsa.',
            },
          ].map(({ num, title, body }, index) => {
            const isActive = visibleProcessStep === index;

            return (
              <article
                key={num}
                onMouseEnter={() => {
                  setActiveProcessStep(index);
                  setHoveredProcessStep(index);
                }}
                onMouseLeave={() => setHoveredProcessStep(null)}
                className={`relative rounded-[var(--r)] border p-4 transition-all duration-200 ${
                  isActive
                    ? '-translate-y-1 border-[var(--accent)] bg-[var(--accent-bg)] shadow-md'
                    : 'border-[var(--border)] bg-[var(--surface)]'
                }`}
              >
                <span
                  className={`relative z-10 inline-flex h-14 w-14 items-center justify-center rounded-full border text-base font-semibold transition-all duration-200 ${
                    isActive
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]'
                  }`}
                >
                  {num}
                </span>
                <h3
                  className={`mt-4 text-sm font-semibold transition duration-200 ${
                    isActive ? 'text-[var(--accent)]' : 'text-[var(--text)]'
                  }`}
                >
                  {title}
                </h3>
                <p
                  className={`mt-2 text-sm leading-relaxed transition duration-200 ${
                    isActive ? 'text-[var(--text)]' : 'text-[var(--muted)]'
                  }`}
                >
                  {body}
                </p>
              </article>
            );
          })}
        </div>
      </RevealOnScroll>

      {/* ── 3. TIPOS ── */}
      <RevealOnScroll className="order-3 mx-auto w-full max-w-4xl px-4 pb-14 md:px-6 md:pb-20">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Tipos de junta</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">Elige el formato que va con tu grupo</h2>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            onClick={() => setTipoActivo('normal')}
            className={`rounded-[var(--r)] border-2 bg-[var(--surface)] p-5 text-left transition-all ${
              tipoActivo === 'normal'
                ? 'border-[var(--green)] shadow-md'
                : 'border-[var(--border)] hover:border-[var(--faint)]'
            }`}
          >
            <span className="text-2xl">🤝</span>
            <h3 className="mt-3 text-base font-semibold">Junta Normal</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
              Para grupos con confianza. Todos pagan la misma cuota y reciben la misma bolsa.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {['Turnos automáticos', 'Recordatorios', 'Panel del grupo', 'Score de confianza', 'Sin caos en WhatsApp'].map((f) => (
                <span
                  key={f}
                  className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-2 py-0.5 text-[11px] text-[var(--muted)]"
                >
                  {f}
                </span>
              ))}
            </div>
          </button>

          <button
            onClick={() => setTipoActivo('incentivos')}
            className={`rounded-[var(--r)] border-2 bg-[var(--surface)] p-5 text-left transition-all ${
              tipoActivo === 'incentivos'
                ? 'border-[var(--accent)] shadow-md'
                : 'border-[var(--border)] hover:border-[var(--faint)]'
            }`}
          >
            <span className="text-2xl">🎯</span>
            <h3 className="mt-3 text-base font-semibold">Junta con Incentivos</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
              Para grupos mixtos. Quienes reciben el turno antes pagan más; quienes reciben después pagan menos.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {['Todo lo de junta normal', 'Cuotas diferenciadas', 'Sin penalidades', 'Ideal para grupos nuevos'].map((f) => (
                <span
                  key={f}
                  className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-2 py-0.5 text-[11px] text-[var(--muted)]"
                >
                  {f}
                </span>
              ))}
            </div>
          </button>
        </div>

        {/* Detalle expandido */}
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(tipoActivo === 'normal' ? normalFeatures : incentivosFeatures).map((f) => (
            <div key={f.title} className="flex gap-3 rounded-[var(--r-sm)] bg-[var(--surface)] p-3">
              <span
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] text-lg"
                style={{ background: f.accentBg }}
              >
                {f.icon}
              </span>
              <div>
                <h4 className="text-sm font-semibold leading-snug text-[var(--text)]">{f.title}</h4>
                <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </RevealOnScroll>

      {/* ── 4. SIMULADOR ── */}
      <RevealOnScroll className="order-4 border-y border-[var(--border)] bg-[var(--surface)]">
        <div id="simulador" className="mx-auto w-full max-w-5xl scroll-mt-20 px-4 py-12 md:px-6 md:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Simulador</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">Calcula tu junta en segundos</h2>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--text)]">
                Personas
                <span className="rounded-full bg-[var(--accent-bg)] px-2 py-0.5 text-[11px] font-bold text-[var(--accent)]">
                  {personas}
                </span>
              </label>
              <select
                value={personas}
                onChange={(e) => setPersonas(+e.target.value)}
                className="w-full rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                {Array.from({ length: 17 }, (_, i) => i + 4).map((n) => (
                  <option key={n} value={n}>{n} personas</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--text)]">
                Cuota base
                <span className="rounded-full bg-[var(--accent-bg)] px-2 py-0.5 text-[11px] font-bold text-[var(--accent)]">
                  S/ {cuota.toLocaleString('es-PE')}
                </span>
              </label>
              <input
                type="range"
                min={20}
                max={2000}
                step={10}
                value={cuota}
                onChange={(e) => setCuota(+e.target.value)}
                className="w-full accent-[var(--accent)]"
              />
              <div className="mt-1 flex justify-between text-[11px] text-[var(--muted)]">
                <span>S/ 20</span>
                <span>S/ 2,000</span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-[var(--text)]">Frecuencia</label>
              <select
                value={frecuencia}
                onChange={(e) => setFrecuencia(e.target.value as Frecuencia)}
                className="w-full rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                <option>Semanal</option>
                <option>Quincenal</option>
                <option>Mensual</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-[var(--text)]">Tipo de junta</label>
              <div className="flex overflow-hidden rounded-[var(--r-sm)] border border-[var(--border)]">
                <button
                  onClick={() => setSimTipo('normal')}
                  className={`flex-1 py-2 text-sm font-medium transition ${
                    simTipo === 'normal' ? 'bg-[var(--dark-1)] text-white' : 'bg-[var(--bg)] text-[var(--muted)] hover:bg-[var(--border)]'
                  }`}
                >
                  Normal
                </button>
                <button
                  onClick={() => setSimTipo('incentivos')}
                  className={`flex-1 py-2 text-sm font-medium transition ${
                    simTipo === 'incentivos' ? 'bg-[var(--dark-1)] text-white' : 'bg-[var(--bg)] text-[var(--muted)] hover:bg-[var(--border)]'
                  }`}
                >
                  Con Incentivos
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: 'Bolsa por turno', value: `S/ ${sim.bolsa.toLocaleString('es-PE')}` },
              { label: 'Duración del ciclo', value: sim.duracionLabel },
              simTipo === 'incentivos'
                ? { label: 'Rango de cuotas', value: `S/ ${sim.cuotaMin} – S/ ${sim.cuotaMax}` }
                : { label: 'Cuota por período', value: `S/ ${cuota.toLocaleString('es-PE')}` },
            ].map((item) => (
              <div key={item.label} className="rounded-[var(--r)] border border-[var(--border)] bg-[var(--bg)] p-4">
                <p className="text-[11px] uppercase tracking-wider text-[var(--muted)]">{item.label}</p>
                <p className="mt-1 font-mono text-base font-semibold text-[var(--text)]">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Vista de turnos</p>
              <span className="text-[11px] text-[var(--muted)]">Selecciona tu turno</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: personas }, (_, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  {simTipo === 'incentivos' && (
                    <span className="font-mono text-[10px] text-[var(--muted)]">S/{sim.turnosCuota[i]}</span>
                  )}
                  <span
                    onClick={() => setTurnoActivo(i + 1)}
                    className={`inline-flex cursor-pointer select-none items-center justify-center rounded-full px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-80 ${turnColor(i)}`}
                  >
                    T{i + 1}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-[var(--muted)]">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-[var(--dark-1)]" />
                Turno activo
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-[var(--green)]" />
                Ya cobró
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-[var(--border)]" />
                Pendiente
              </span>
            </div>
          </div>

          {/* Resultado del turno seleccionado */}
          <div className="mt-5 rounded-[var(--r)] border border-[var(--accent)] bg-[var(--accent-bg)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
              Turno {turnoActivo} seleccionado
            </p>
            <p className="mt-1 text-sm text-[var(--text)]">
              Cobras{' '}
              <span className="font-mono font-semibold">S/ {sim.bolsa.toLocaleString('es-PE')}</span>{' '}
              en la {sim.periodoLabel} {turnoActivo} del ciclo.
              {simTipo === 'incentivos' && (
                <> Tu cuota durante todo el ciclo será{' '}
                  <span className="font-mono font-semibold">S/ {cuotaDelTurno.toLocaleString('es-PE')}</span>{' '}
                  por {sim.periodoLabel}.
                </>
              )}
            </p>
          </div>

          <div className="mt-5 flex justify-end">
            <Link
              href="/register"
              className="inline-flex rounded-[var(--r-sm)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-dark)]"
            >
              Crear esta junta →
            </Link>
          </div>
        </div>
      </RevealOnScroll>

      {/* ── 5. FAQ ── */}
      <RevealOnScroll className="order-5 mx-auto w-full max-w-3xl px-4 py-14 md:px-6 md:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Preguntas frecuentes</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">Lo que siempre preguntan</h2>

        <div className="mt-6 divide-y divide-[var(--border)]">
          {faqs.map((faq, i) => (
            <div key={i}>
              <button
                onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-semibold text-[var(--text)] transition-colors hover:text-[var(--accent)]"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  size={16}
                  className="shrink-0 text-[var(--muted)] transition-transform duration-200"
                  style={{ transform: faqOpen === i ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>
              <div
                className="grid transition-[grid-template-rows] duration-200 ease-out"
                style={{ gridTemplateRows: faqOpen === i ? '1fr' : '0fr' }}
              >
                <div className="min-h-0 overflow-hidden">
                  <p className="pb-4 text-sm leading-relaxed text-[var(--muted)]">{faq.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </RevealOnScroll>

      {/* ── 6. CTA FINAL ── */}
      <section className="order-7 bg-[var(--dark-1)]">
        <div className="mx-auto w-full max-w-4xl px-4 py-16 text-center md:py-[72px]">
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            ¿Listo para tu primera junta digital?
          </h2>
          <p className="mt-3 text-sm text-[var(--dark-text)] md:text-base">
            Gratis, sin app, sin burocracia. Tu grupo empieza hoy.
          </p>
          <Link
            href="/register"
            className="mt-6 inline-flex rounded-[var(--r-sm)] bg-white px-5 py-3 text-sm font-semibold text-[var(--dark-1)] transition hover:bg-[var(--faint)]"
          >
            Crear mi junta →
          </Link>
          <p className="mt-4">
            <a
              href="mailto:hola@juntealo.com"
              className="text-sm text-[var(--dark-muted)] transition-colors hover:text-white hover:underline hover:underline-offset-2"
            >
              ¿Tienes dudas? Habla con nosotros
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
