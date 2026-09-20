'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertCircle, ArrowDown, CheckCircle2, Info, TrendingDown, TrendingUp } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatAmount, formatSoles } from '@/lib/number-format';
import {
  DashboardMetric,
  DashboardPeriodDays,
  calculateFunnelRate,
  fetchProductDashboard,
  ProductDashboardData
} from '@/services/product-analytics.service';

type SeriesKey = 'activeSavers' | 'volume' | 'juntasWithMovement';

const SERIES: Array<{ key: SeriesKey; label: string }> = [
  { key: 'activeSavers', label: 'Active Savers' },
  { key: 'volume', label: 'Volumen' },
  { key: 'juntasWithMovement', label: 'Juntas con movimiento' }
];

function safeNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function formatPercent(value: number | null | undefined) {
  const number = safeNumber(value);
  return number === null ? 'Sin datos suficientes' : `${formatAmount(number, 1)}%`;
}

function formatDuration(hours: number | null | undefined) {
  const number = safeNumber(hours);
  if (number === null) return 'Sin datos suficientes';
  return number < 24 ? `${formatAmount(number, 1)} h` : `${formatAmount(number / 24, 1)} días`;
}

function maturityRateText(rate: number | null | undefined, eligible: number) {
  return eligible === 0 || safeNumber(rate) === null ? 'Sin cohorte madura' : formatPercent(rate);
}

function Comparison({ metric, percentagePoints = false }: { metric: DashboardMetric; percentagePoints?: boolean }) {
  const current = safeNumber(metric.current);
  const previous = safeNumber(metric.previous);
  if (current === null || previous === null || (!percentagePoints && previous === 0)) {
    return <span className="text-xs text-slate-400">Sin base comparativa</span>;
  }

  const change = percentagePoints ? current - previous : ((current - previous) / Math.abs(previous)) * 100;
  if (!Number.isFinite(change)) return <span className="text-xs text-slate-400">Sin base comparativa</span>;
  const positive = change >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${positive ? 'text-emerald-700' : 'text-rose-600'}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {formatAmount(Math.abs(change), 1)}{percentagePoints ? ' pp' : '%'} vs período anterior
    </span>
  );
}

function MetricCard({ label, value, metric, tooltip, percentagePoints }: {
  label: string;
  value: string;
  metric: DashboardMetric;
  tooltip: string;
  percentagePoints?: boolean;
}) {
  return (
    <Card className="flex min-h-32 flex-col justify-between gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <span title={tooltip} aria-label={tooltip} className="cursor-help text-slate-400"><Info className="h-4 w-4" /></span>
      </div>
      <p className={`font-semibold tracking-tight text-slate-950 ${value.length > 16 ? 'text-lg' : 'text-3xl'}`}>{value}</p>
      <Comparison metric={metric} percentagePoints={percentagePoints} />
    </Card>
  );
}

function MaturityValue({ label, current, previous, unit = 'juntas', description }: {
  label: string;
  current: { eligible: number; achieved: number; rate: number | null };
  previous: { eligible: number; achieved: number; rate: number | null };
  unit?: string;
  description: string;
}) {
  return (
    <div className="min-w-0" title={`${description} ${current.achieved} de ${current.eligible} ${unit} elegibles.`}>
      <p className={`font-semibold text-slate-950 ${current.eligible === 0 ? 'text-sm' : 'text-2xl'}`}>{maturityRateText(current.rate, current.eligible)}</p>
      <p className="mt-1 text-xs text-slate-500">{label} · {current.achieved} de {current.eligible}</p>
      <Comparison metric={{ current: current.rate, previous: previous.rate }} percentagePoints />
    </div>
  );
}

function HealthValue({ value, label, title }: { value: string; label: string; title?: string }) {
  return (
    <div className="min-w-0" title={title}>
      <p className={`font-semibold text-slate-950 ${value.length > 18 ? 'text-sm' : 'text-2xl'}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-white" aria-label="Cargando dashboard" />;
}

export function ProductDashboard() {
  const [days, setDays] = useState<DashboardPeriodDays>(30);
  const [data, setData] = useState<ProductDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<SeriesKey>('activeSavers');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchProductDashboard(days).then((result) => {
      if (!active) return;
      if (result.ok) setData(result.data);
      else setError(result.message);
      setLoading(false);
    });
    return () => { active = false; };
  }, [days, reload]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Resumen del producto</h2>
          <p className="text-sm text-slate-500">Crecimiento, salud y señales operativas.</p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1" aria-label="Período del dashboard">
          {([7, 30, 90] as DashboardPeriodDays[]).map((option) => (
            <button key={option} type="button" onClick={() => setDays(option)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${days === option ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'}`}
              aria-pressed={days === option}>{option}D</button>
          ))}
        </div>
      </div>

      {loading && !data ? <DashboardSkeleton /> : error ? (
        <Card className="border-rose-200 bg-rose-50">
          <p className="font-medium text-rose-800">No se pudo cargar el resumen.</p>
          <p className="mt-1 text-sm text-rose-700">{error}</p>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => setReload((value) => value + 1)}>Reintentar</Button>
        </Card>
      ) : data && (
        <>
          <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-5 ${loading ? 'opacity-60' : ''}`}>
            <MetricCard label="Usuarios activos ahorrando" value={formatAmount(data.kpis.activeSavers.current ?? 0, 0)} metric={data.kpis.activeSavers} tooltip="Usuarios únicos que pagaron o recibieron al menos un pago confirmado en una junta válida durante el período." />
            <MetricCard label="Juntas con movimiento" value={formatAmount(data.kpis.juntasWithMovement.current ?? 0, 0)} metric={data.kpis.juntasWithMovement} tooltip="Juntas distintas con al menos un pago confirmado durante el período seleccionado." />
            <MetricCard label="Volumen confirmado" value={formatSoles(data.kpis.confirmedVolume.current ?? 0, 0)} metric={data.kpis.confirmedVolume} tooltip="Suma únicamente pagos aprobados y confirmados en PEN durante el período. No se convierten ni mezclan otras monedas." />
            <MetricCard label="Junta Activation Rate" value={formatPercent(data.kpis.activationRate.current)} metric={data.kpis.activationRate} percentagePoints tooltip="Porcentaje acumulado de juntas de la cohorte que llegaron a activarse." />
            <MetricCard label="On-time Payment Rate" value={formatPercent(data.kpis.onTimePaymentRate.current)} metric={data.kpis.onTimePaymentRate} percentagePoints tooltip="Pagos confirmados dentro del deadline operacional dividido entre pagos confirmados." />
          </div>

          <div className="grid gap-4 xl:grid-cols-5">
            <Card className="xl:col-span-3">
              <div className="mb-5">
                <h3 className="font-semibold text-slate-950">Funnel de juntas</h3>
                <p className="text-xs text-slate-500">Cohorte de juntas creadas durante los últimos {days} días; se observa su avance hasta hoy.</p>
              </div>
              <div className="space-y-1">
                {([
                  ['Creadas', data.funnel.created], ['Primer integrante', data.funnel.first_member],
                  ['Llenas', data.funnel.filled], ['Activadas', data.funnel.activated],
                  ['Primer pago confirmado', data.funnel.first_payment], ['Completadas', data.funnel.completed]
                ] as Array<[string, number]>).map(([label, count], index, rows) => {
                  const created = rows[0][1];
                  return (
                    <div key={label}>
                      {index > 0 && <ArrowDown className="ml-4 h-4 w-4 text-slate-300" aria-hidden="true" />}
                      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-lg border border-slate-100 px-4 py-2.5">
                        <span className="text-sm font-medium text-slate-700">{label}</span>
                        <span className="text-lg font-semibold tabular-nums text-slate-950">{count}</span>
                        <span className="w-28 text-right text-xs text-slate-500">
                          {calculateFunnelRate(count, created) !== null ? `${formatAmount(calculateFunnelRate(count, created)!, 0)}% total` : 'Sin datos'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
                <MaturityValue label="Activation ≤7d" current={data.kpis.activationWithin7d.current} previous={data.kpis.activationWithin7d.previous} description="Porcentaje de juntas que se activaron dentro de sus primeros 7 días. Solo incluye juntas con al menos 7 días de observación." />
                <HealthValue value={formatDuration(data.funnel.median_hours_to_fill)} label="Median Time to Fill" />
                <HealthValue value={formatDuration(data.funnel.median_hours_to_activation)} label="Median Time to Activation" />
              </div>
              <p className="mt-4 text-xs text-slate-500">El funnel es acumulado. Las métricas ≤7d usan únicamente cohortes con suficiente tiempo de observación. {data.funnel.open_in_progress} juntas siguen abiertas o en progreso{safeNumber(data.funnel.median_age_days) === null ? '.' : `; la antigüedad mediana es ${formatAmount(data.funnel.median_age_days!, 1)} días.`}</p>
            </Card>

            <Card className="xl:col-span-2">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div><h3 className="font-semibold text-slate-950">Evolución del producto</h3><p className="text-xs text-slate-500">{data.period.granularity === 'week' ? 'Por semana' : 'Por día'}</p></div>
                <select value={series} onChange={(event) => setSeries(event.target.value as SeriesKey)} className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs">
                  {SERIES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                </select>
              </div>
              {data.evolution.length === 0 ? <div className="grid h-64 place-items-center text-sm text-slate-400">Sin datos suficientes</div> : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.evolution} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                      <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip labelFormatter={(value) => new Date(value).toLocaleDateString('es-PE')} formatter={(value: number) => series === 'volume' ? formatSoles(value, 0) : formatAmount(value, 0)} />
                      <Line type="monotone" dataKey={series} stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card><h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Retención</h3><div className="mt-4 grid grid-cols-2 gap-4"><HealthValue value={formatPercent(data.health.repeatJuntaRate)} label="Repeat Junta acumulado" title="Usuarios de juntas completadas en el período que luego ingresaron a otra junta distinta, sobre todos los usuarios elegibles." /><MaturityValue label="Repeat ≤30d" unit="usuarios" description="Porcentaje de usuarios que ingresaron a otra junta dentro de los 30 días posteriores a completar una junta. Para garantizar una ventana completa de observación, la cohorte se desplaza 30 días hacia atrás." current={{ eligible: data.health.repeatWithin30d.current.eligibleUsers, achieved: data.health.repeatWithin30d.current.repeatedUsers, rate: data.health.repeatWithin30d.current.rate }} previous={{ eligible: data.health.repeatWithin30d.previous.eligibleUsers, achieved: data.health.repeatWithin30d.previous.repeatedUsers, rate: data.health.repeatWithin30d.previous.rate }} /><HealthValue value={data.health.medianDaysToNextJunta === null ? 'Sin datos suficientes' : `${formatAmount(data.health.medianDaysToNextJunta, 1)} días`} label="Hasta próxima junta" title="Mediana desde la finalización de la junta elegible hasta el ingreso posterior a otra junta distinta." /><HealthValue value={formatPercent(data.health.retentionRate)} label={`Retención de Active Savers ${days}d`} title="Active Savers presentes en ambos períodos, sobre los Active Savers del período anterior." /></div></Card>
            <Card><h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Liquidez</h3><div className="mt-4 grid grid-cols-3 gap-3"><HealthValue value={formatPercent(data.health.fillRate)} label="Fill Rate acumulado" /><MaturityValue label="Fill ≤7d" current={data.health.fillWithin7d.current} previous={data.health.fillWithin7d.previous} description="Porcentaje de juntas que se llenaron dentro de sus primeros 7 días. Solo incluye juntas con al menos 7 días de observación." /><HealthValue value={formatDuration(data.health.medianHoursToFill)} label="Time to Fill" /></div></Card>
            <Card><div className="flex items-center gap-2"><h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Viralidad</h3><span title="K-factor interno = registros atribuidos / invitadores activos. Cada invitación es un link técnico y un mismo link puede generar más de un registro; no es un coeficiente viral universal." className="cursor-help text-slate-400"><Info className="h-3.5 w-3.5" /></span></div><div className="mt-4 grid grid-cols-3 gap-3"><HealthValue value={formatPercent(data.health.inviteConversion)} label="Invite Conversion" title="Registros atribuidos dividido entre aperturas únicas." /><HealthValue value={safeNumber(data.health.invitesPerInviter) === null ? 'Sin datos suficientes' : formatAmount(data.health.invitesPerInviter!, 2)} label="Links / inviter" /><HealthValue value={safeNumber(data.health.kFactor) === null ? 'Sin datos suficientes' : formatAmount(data.health.kFactor!, 2)} label="K-factor" /></div></Card>
          </div>

          <Card>
            <div className="mb-3 flex items-center justify-between gap-3"><div><h3 className="font-semibold text-slate-950">Requiere atención</h3><p className="text-xs text-slate-500">Señales operativas actuales.</p></div><div className={`inline-flex items-center gap-1.5 text-xs ${data.dataQualityIssues > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{data.dataQualityIssues > 0 ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}Calidad de datos · {data.dataQualityIssues > 0 ? `${data.dataQualityIssues} incidencias` : 'Sin incidencias'}</div></div>
            {data.attention.pending_validation + data.attention.stale_unfilled + data.attention.overdue_payments === 0 ? (
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">No hay acciones operativas pendientes.</div>
            ) : <div className="divide-y divide-slate-100">{
              [
                { count: data.attention.pending_validation, text: 'pagos pendientes de validación', href: '/admin/pagos', cta: 'Validar pagos' },
                { count: data.attention.stale_unfilled, text: `juntas sin completar después de ${data.config.staleJuntaDays} días`, href: '/admin/juntas', cta: 'Gestionar' },
                { count: data.attention.overdue_payments, text: 'obligaciones de pago vencidas sin confirmar', href: '/admin/juntas', cta: 'Revisar juntas' }
              ].filter((item) => item.count > 0).map((item) => (
                <div key={item.text} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
                  <p className="flex-1 text-sm text-slate-700"><strong className="text-slate-950">{item.count}</strong> {item.text}</p>
                  <Link href={item.href}><Button size="sm" variant="outline">{item.cta}</Button></Link>
                </div>
              ))}</div>}
          </Card>
          <p className="text-right text-xs text-slate-400">{data.period.analyticsCompleteSince ? `Lifecycle analytics completos desde: ${new Date(data.period.analyticsCompleteSince).toLocaleDateString('es-PE')}` : 'El histórico previo a Product Analytics puede ser incompleto.'}</p>
        </>
      )}
    </div>
  );
}
