'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LandingNavbar } from './landing-navbar';
import { RevealOnScroll } from './reveal';

type TipoJunta = 'normal' | 'incentivos';

const normalFeatures = [
  { icon: '📊', title: 'Panel del grupo', desc: 'Todos ven el estado en tiempo real: quién pagó, quién falta y el turno activo.' },
  { icon: '🔔', title: 'Recordatorios automáticos', desc: 'La plataforma avisa a cada integrante cuando se acerca su fecha de pago.' },
  { icon: '🛡️', title: 'Score de confianza', desc: 'Cada integrante acumula puntaje según su historial. Transparente para todos.' },
  { icon: '🔄', title: 'Turnos automáticos', desc: 'El sistema gestiona el orden y confirma quién cobra en cada período.' },
];

const incentivosFeatures = [
  {
    icon: '💸',
    title: 'Recibe antes',
    desc: 'Quienes toman los primeros turnos acceden al dinero antes, cuando más lo necesitan.',
    accent: 'var(--accent)',
    accentBg: 'var(--accent-bg)',
  },
  {
    icon: '📉',
    title: 'Pagas menos si cobras después',
    desc: 'Los últimos turnos reciben la misma bolsa, pero con cuotas más bajas durante todo el ciclo.',
    accent: 'var(--green)',
    accentBg: 'var(--green-bg)',
  },
  {
    icon: '⚖️',
    title: 'Sistema equilibrado',
    desc: 'El grupo se balancea automáticamente para que todos reciban exactamente la misma bolsa de dinero.',
    accent: 'var(--accent)',
    accentBg: 'var(--accent-bg)',
  },
  {
    icon: '🤝',
    title: 'Ideal para grupos nuevos',
    desc: 'Personas con distintas necesidades pueden participar sin depender de confianza total previa.',
    accent: 'var(--green)',
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
  const [tipoActivo, setTipoActivo] = useState<TipoJunta>('normal');
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [personas, setPersonas] = useState(5);
  const [cuota, setCuota] = useState(400);
  const [frecuencia, setFrecuencia] = useState<'Semanal' | 'Quincenal' | 'Mensual'>('Semanal');
  const [simTipo, setSimTipo] = useState<TipoJunta>('normal');
  const [turnoActivo, setTurnoActivo] = useState(2);

  useEffect(() => {
    setTurnoActivo((prev) => Math.min(prev, personas));
  }, [personas]);

  const bolsa = personas * cuota;
  const duracionLabel = `${personas} ${frecuencia === 'Semanal' ? 'semanas' : frecuencia === 'Quincenal' ? 'quincenas' : 'meses'}`;
  const cuotaMax = Math.round(cuota * 1.2);
  const cuotaMin = Math.round(cuota * 0.8);

  // Redistribución lineal simétrica: suma de turnosCuota = personas × cuota exactamente.
  // Turno i=0 paga más (+20%), turno i=N-1 paga menos (-20%), el central queda neutro.
  const turnosCuota = Array.from({ length: personas }, (_, i) => {
    if (personas === 1) return cuota;
    const delta = Math.round(cuota * 0.2 * (1 - (2 * i) / (personas - 1)));
    return cuota + delta;
  });

  const turnColor = (i: number) => {
    const num = i + 1;
    if (num < turnoActivo) return 'bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]';
    if (num === turnoActivo) return 'bg-[var(--dark-1)] text-white';
    return 'bg-[var(--border)] text-[var(--muted)]';
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <LandingNavbar />

      <main>
        {/* ── 1. HERO ── */}
        <RevealOnScroll className="mx-auto w-full max-w-4xl px-4 py-14 text-center md:px-6 md:py-20">
          <span className="inline-flex items-center rounded-full bg-[var(--green-bg)] px-3 py-1 text-xs font-semibold text-[var(--green)]">
            ¿Cómo funciona?
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-tight tracking-[-1.5px] text-[var(--text)] md:text-5xl">
            La junta que siempre hiciste,
            <br className="hidden md:block" /> ahora sin el drama
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-relaxed text-[var(--muted)]">
            Organiza tu grupo de ahorro rotativo en minutos. Elige entre junta normal o con incentivos según la confianza de tu grupo.
          </p>
        </RevealOnScroll>

        {/* ── 2. PROCESO ── */}
        <RevealOnScroll className="mx-auto w-full max-w-3xl px-4 pb-14 md:px-6 md:pb-20">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">El proceso</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">4 pasos para empezar</h2>

          <div className="mt-8 space-y-0">
            {[
              {
                num: 1,
                title: 'Crea la junta',
                body: 'Define nombre, cantidad de integrantes, monto de cuota, frecuencia (semanal / quincenal / mensual) y si será Normal o con Incentivos.',
                callout: null,
                last: false,
              },
              {
                num: 2,
                title: 'Invita a tu grupo',
                body: 'Comparte un enlace único. Cada integrante se registra y verifica su identidad antes de unirse. Así sabes con quién estás antes de empezar.',
                callout: null,
                last: false,
              },
              {
                num: 3,
                title: 'Todos aportan por su cuenta',
                body: (
                  <>
                    Cada integrante paga directamente al receptor del turno o al organizador por{' '}
                    <strong>Yape, Plin o transferencia bancaria</strong>. La plataforma no mueve ni
                    retiene dinero — solo registra, envía recordatorios y lleva el control de quién
                    pagó y quién no.
                  </>
                ),
                callout: '⚠️ Los pagos se realizan directamente entre integrantes por Yape, Plin o transferencia. Juntealo no procesa ni retiene dinero.',
                last: false,
              },
              {
                num: 4,
                title: 'El turno cobra la bolsa',
                body: 'Cuando los pagos del período están confirmados, el integrante con el turno activo recibe su bolsa. El ciclo continúa hasta que todos hayan cobrado.',
                callout: null,
                last: true,
              },
            ].map(({ num, title, body, callout, last }) => (
              <div key={num} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--dark-1)] text-sm font-bold text-white">
                    {num}
                  </span>
                  {!last && <div className="mt-2 flex-1 w-px bg-[var(--border)]" />}
                </div>
                <div className={`${last ? '' : 'pb-8'} pt-1 min-w-0 flex-1`}>
                  <h3 className="text-[15px] font-semibold leading-tight">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">{body}</p>
                  {callout && (
                    <div
                      className="mt-3 rounded-[var(--r-sm)] border p-3 text-sm leading-relaxed"
                      style={{ background: '#fff8e6', borderColor: '#f0d080', color: '#b37800' }}
                    >
                      {callout}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </RevealOnScroll>

        {/* ── 3. TIPOS ── */}
        <RevealOnScroll className="mx-auto w-full max-w-4xl px-4 pb-14 md:px-6 md:pb-20">
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
          {tipoActivo === 'normal' ? (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {normalFeatures.map((f) => (
                <div key={f.title} className="rounded-[var(--r)] border border-[var(--border)] bg-[var(--surface)] p-4">
                  <span className="text-xl">{f.icon}</span>
                  <h4 className="mt-2 text-sm font-semibold">{f.title}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{f.desc}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="rounded-[var(--r)] border border-[var(--border)] bg-[var(--surface)] p-5">
                <h4 className="text-sm font-semibold">¿Cómo funcionan los incentivos?</h4>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                  No todos pagan la misma cuota. El sistema ajusta el monto según el turno:
                </p>
                <ul className="mt-3 space-y-2.5 text-sm">
                  <li className="flex gap-2 text-[var(--muted)]">
                    <span className="shrink-0">🔼</span>
                    Los que reciben la bolsa <strong className="text-[var(--text)]">primero</strong> pagan una{' '}
                    <strong className="text-[var(--text)]">cuota más alta</strong> — están recibiendo dinero antes de haberlo aportado todo.
                  </li>
                  <li className="flex gap-2 text-[var(--muted)]">
                    <span className="shrink-0">🔽</span>
                    Los que reciben{' '}
                    <strong className="text-[var(--text)]">después</strong> pagan una{' '}
                    <strong className="text-[var(--text)]">cuota más baja</strong> — porque ya aportaron más tiempo y &quot;prestaron&quot; su dinero al grupo.
                  </li>
                  <li className="flex gap-2 text-[var(--muted)]">
                    <span className="shrink-0">⚖️</span>
                    La bolsa que recibe cada persona es la misma. Solo varía el costo total de participar según el turno.
                  </li>
                </ul>

                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[400px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        {['Turno', 'Recibe', 'Cuota que paga', 'Costo total del ciclo'].map((h) => (
                          <th key={h} className="pb-2 pr-4 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] last:pr-0">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-[var(--border)]">
                        <td className="py-2.5 pr-4 font-medium">#1 (primero)</td>
                        <td className="py-2.5 pr-4">S/ 1,000</td>
                        <td className="py-2.5 pr-4 font-medium text-[var(--destructive)]">S/ 150/sem</td>
                        <td className="py-2.5 font-medium text-[var(--destructive)]">S/ 1,200 <span className="text-xs font-normal">(paga más)</span></td>
                      </tr>
                      <tr className="border-b border-[var(--border)]">
                        <td className="py-2.5 pr-4 font-medium">#5 (medio)</td>
                        <td className="py-2.5 pr-4">S/ 1,000</td>
                        <td className="py-2.5 pr-4 font-medium text-[var(--muted)]">S/ 100/sem</td>
                        <td className="py-2.5 font-medium text-[var(--muted)]">S/ 1,000 <span className="text-xs font-normal">(equilibrio)</span></td>
                      </tr>
                      <tr>
                        <td className="py-2.5 pr-4 font-medium">#10 (último)</td>
                        <td className="py-2.5 pr-4">S/ 1,000</td>
                        <td className="py-2.5 pr-4 font-medium text-[var(--green)]">S/ 70/sem</td>
                        <td className="py-2.5 font-medium text-[var(--green)]">S/ 700 <span className="text-xs font-normal">(paga menos)</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-[var(--muted)]">
                  No hay penalidades ni intereses — es un acuerdo transparente del grupo desde el inicio.
                </p>
              </div>

              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.13em] text-[var(--muted)]">
                  ¿Qué cambia con incentivos?
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {incentivosFeatures.map((f) => (
                    <div
                      key={f.title}
                      className="group rounded-[var(--r)] border border-[var(--border)] bg-[var(--surface)] p-5 transition-shadow hover:shadow-sm"
                    >
                      <span
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                        style={{ background: f.accentBg }}
                      >
                        {f.icon}
                      </span>
                      <h4 className="mt-3 text-sm font-bold leading-snug tracking-tight text-[var(--text)]">
                        {f.title}
                      </h4>
                      <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </RevealOnScroll>

        {/* ── 4. SIMULADOR ── */}
        <RevealOnScroll className="border-y border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto w-full max-w-4xl px-4 py-14 md:px-6 md:py-20">
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
                  onChange={(e) => setFrecuencia(e.target.value as typeof frecuencia)}
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
                { label: 'Bolsa por turno', value: `S/ ${bolsa.toLocaleString('es-PE')}` },
                { label: 'Duración del ciclo', value: duracionLabel },
                simTipo === 'incentivos'
                  ? { label: 'Rango de cuotas', value: `S/ ${cuotaMin} – S/ ${cuotaMax}` }
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
                <span className="text-[11px] text-[var(--muted)]">Toca un turno para simular</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: personas }, (_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    {simTipo === 'incentivos' && (
                      <span className="font-mono text-[10px] text-[var(--muted)]">S/{turnosCuota[i]}</span>
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
          </div>
        </RevealOnScroll>

        {/* ── 5. FAQ ── */}
        <RevealOnScroll className="mx-auto w-full max-w-3xl px-4 py-14 md:px-6 md:py-20">
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
                  <span
                    className="shrink-0 text-[var(--muted)] transition-transform duration-200"
                    style={{ transform: faqOpen === i ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    ▾
                  </span>
                </button>
                <div
                  style={{
                    overflow: 'hidden',
                    maxHeight: faqOpen === i ? '300px' : '0',
                    transition: 'max-height 0.25s ease',
                  }}
                >
                  <p className="pb-4 text-sm leading-relaxed text-[var(--muted)]">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </RevealOnScroll>

        {/* ── 6. CTA FINAL ── */}
        <section className="bg-[var(--dark-1)]">
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
    </div>
  );
}
