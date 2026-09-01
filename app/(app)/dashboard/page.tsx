'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getPaymentAlertState, type PaymentAlertState } from '@/lib/payment-alert';
import { getWeekKey, MISSION_REWARDS } from '@/services/junta-engagement.service';
import { fetchUserPaymentNotifications, fetchUserJuntaSnapshot } from '@/services/juntas.repository';
import {
  buildJuntaScoreStatsFromDomain,
  getScoreBadge,
  type UserJuntaScoreResult,
  getUserJuntaScore
} from '@/services/junta-score.service';
import { fetchClaimedMissions, recordRachaMilestone, type ClaimedMission } from '@/services/missions.repository';
import { fetchReferralStats, type ReferralStats } from '@/services/referral.service';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
import { Junta, JuntaMember, Payment, PaymentSchedule, Payout } from '@/types/domain';
import { parseCalendarDate } from '@/lib/calendar-date';
import { getActiveMemberCountByJunta } from '@/lib/junta-members';
import { normalizePaymentStatus } from '@/lib/payment-status';
import { JuntaAvatar } from '@/components/junta-avatar';
import { Circle, CheckCircle2, Copy, MessageCircle, Trophy } from 'lucide-react';
import { RachaCard } from '@/components/ui/racha-card';
import { computeGlobalRacha } from '@/lib/racha';

type UpcomingPayoutData = {
  juntaId: string;
  juntaNombre: string;
  ronda: number;
  amount: number;
  fecha: Date | null;
};

type ContributionSummaryData = {
  totalAportado: number;
  periodLabel: string;
};

type JuntaCardData = {
  id: string;
  nombre: string;
  miembros: number;
  cuota: number;
  frecuencia: Junta['frecuencia_pago'];
  tipo: Junta['tipo_junta'];
  turno: number | null;
  nextDate: Date | null;
  status: 'pendiente' | 'al_dia';
};

type WeeklyGoal = {
  label: string;
  points: number;
  status: 'pending' | 'completed' | 'unavailable';
};

function money(value: number) {
  return `S/ ${Math.round(value).toLocaleString('es-PE')}`;
}

function getMyJuntaIds(userId: string, juntas: Junta[], members: JuntaMember[]) {
  const owned = juntas.filter((j) => j.admin_id === userId).map((j) => j.id);
  const memberOf = members
    .filter((m) => m.profile_id === userId && m.estado !== 'retirado')
    .map((m) => m.junta_id);
  return Array.from(new Set([...owned, ...memberOf]));
}

function getUpcomingPayout(params: {
  payouts: Payout[];
  schedules: PaymentSchedule[];
  juntas: Junta[];
  userId: string;
}): UpcomingPayoutData | null {
  const userPayouts = params.payouts.filter((item) => item.profile_id === params.userId && !item.entregado_en);
  if (userPayouts.length === 0) return null;

  const mapped = userPayouts
    .map((payout) => {
      const junta = params.juntas.find((item) => item.id === payout.junta_id);
      const schedule = params.schedules.find((item) => item.junta_id === payout.junta_id && item.cuota_numero === payout.ronda_numero);
      return {
        payout,
        junta,
        date: schedule ? parseCalendarDate(schedule.fecha_vencimiento) : null
      };
    })
    .filter((item) => item.junta)
    .sort((a, b) => (a.date?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.date?.getTime() ?? Number.MAX_SAFE_INTEGER));

  const first = mapped[0];
  if (!first || !first.junta) return null;

  return {
    juntaId: first.junta.id,
    juntaNombre: first.junta.nombre,
    ronda: first.payout.ronda_numero,
    amount: first.payout.monto_pozo,
    fecha: first.date
  };
}

function getCurrentCycleContributionSummary(params: {
  userId: string;
  juntas: Junta[];
  payments: Payment[];
  schedules: PaymentSchedule[];
  myJuntaIds: string[];
}): ContributionSummaryData {
  const currentJuntaIds = params.juntas
    .filter((junta) => params.myJuntaIds.includes(junta.id) && junta.estado === 'activa')
    .map((junta) => junta.id);
  const approvedPayments = params.payments.filter((payment) =>
    payment.profile_id === params.userId &&
    currentJuntaIds.includes(payment.junta_id) &&
    normalizePaymentStatus(payment.payment_status ?? payment.estado) === 'approved'
  );
  const totalAportado = approvedPayments.reduce((acc, payment) => acc + payment.monto, 0);
  const periodCount = params.schedules.filter((schedule) => currentJuntaIds.includes(schedule.junta_id)).length;

  return {
    totalAportado,
    periodLabel: `${periodCount > 0 ? periodCount : 0} ${periodCount === 1 ? 'semana' : 'semanas'} · ciclo actual`
  };
}

function getActiveJuntas(params: {
  juntas: Junta[];
  myJuntaIds: string[];
  members: JuntaMember[];
  schedules: PaymentSchedule[];
  userId: string;
  memberCountByJunta: Map<string, number>;
}): JuntaCardData[] {
  const myTurnMap = new Map(
    params.members.filter((member) => member.profile_id === params.userId).map((member) => [member.junta_id, member.orden_turno])
  );

  return params.juntas
    .filter((junta) => params.myJuntaIds.includes(junta.id))
    .filter((junta) => !['cerrada', 'bloqueada', 'eliminada'].includes(junta.estado) && !junta.bloqueada && !junta.deleted_at)
    .map((junta) => {
      const juntaSchedules = params.schedules.filter((schedule) => schedule.junta_id === junta.id);
      const hasPending = juntaSchedules.some((schedule) => schedule.estado === 'vencida');
      const nextSchedule = juntaSchedules
        .slice()
        .sort((a, b) => parseCalendarDate(a.fecha_vencimiento).getTime() - parseCalendarDate(b.fecha_vencimiento).getTime())[0];

      // Only show a real turn number when the junta is active AND has a generated schedule.
      // orden_turno is assigned at join time (before activation), so it must not be
      // displayed until the cronograma is official.
      const turno = junta.estado === 'activa' && juntaSchedules.length > 0
        ? (myTurnMap.get(junta.id) ?? null)
        : null;

      return {
        id: junta.id,
        nombre: junta.nombre,
        miembros: params.memberCountByJunta.get(junta.id) ?? 0,
        cuota: Number(junta.cuota_base ?? junta.monto_cuota ?? 0),
        frecuencia: junta.frecuencia_pago,
        tipo: junta.tipo_junta ?? 'normal',
        turno,
        nextDate: nextSchedule ? parseCalendarDate(nextSchedule.fecha_vencimiento) : null,
        status: hasPending ? 'pendiente' : 'al_dia'
      };
    });
}

function getJuntaHistory(params: { juntas: Junta[]; myJuntaIds: string[]; memberCountByJunta: Map<string, number> }): JuntaCardData[] {
  return params.juntas
    .filter((junta) => params.myJuntaIds.includes(junta.id))
    .filter((junta) => ['cerrada', 'bloqueada'].includes(junta.estado) || Boolean(junta.bloqueada))
    .map((junta) => ({
      id: junta.id,
      nombre: junta.nombre,
      miembros: params.memberCountByJunta.get(junta.id) ?? 0,
      cuota: Number(junta.cuota_base ?? junta.monto_cuota ?? 0),
      frecuencia: junta.frecuencia_pago,
      tipo: junta.tipo_junta ?? 'normal',
      turno: null,
      nextDate: null,
      status: 'al_dia' as const
    }));
}


function PendingPaymentBanner({ data }: { data: PaymentAlertState }) {
  if (!data.juntaId) return null;
  const href = `/juntas/${data.juntaId}?tab=pagos`;
  const isValidating = data.status === 'en_validacion';
  const toneClass = isValidating
    ? 'border-blue-200 bg-blue-50 hover:border-blue-300'
    : data.tone === 'destructive'
    ? 'border-rose-300 bg-rose-100 hover:border-rose-400'
    : 'border-amber-300 bg-amber-100 hover:border-amber-400';
  const titleToneClass = isValidating ? 'text-blue-900' : data.tone === 'destructive' ? 'text-rose-900' : 'text-amber-900';
  const ctaToneClass = isValidating ? 'text-blue-600' : data.tone === 'destructive' ? 'text-rose-700' : 'text-blue-700';
  const ctaLabel = isValidating ? 'Ver estado →' : 'Pagar →';

  return (
    <Link href={href}>
      <Card className={`border p-4 ${toneClass}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/70">⏺</div>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${titleToneClass}`}>{data.title}</p>
              <p className={`break-words text-sm ${titleToneClass}`}>{data.subtitle}</p>
            </div>
          </div>
          <p className={`text-sm font-semibold ${ctaToneClass}`}>{ctaLabel}</p>
        </div>
      </Card>
    </Link>
  );
}

function JuntaScoreCard({ score, paymentsOnTime, completedCycles, referredActive }: {
  score: UserJuntaScoreResult;
  paymentsOnTime: number;
  completedCycles: number;
  referredActive: number;
}) {
  return (
    <Card dark className="text-white md:rounded-xl md:p-4 lg:p-3.5">
      <div className="grid gap-4 md:grid-cols-[52px_1fr] md:items-start lg:gap-x-3 lg:gap-y-2">
        <div className="mx-auto flex h-24 w-24 flex-col items-center justify-center rounded-full border-[5px] border-emerald-400 md:h-[52px] md:w-[52px] md:border-[3px]">
          <p className="font-mono text-4xl font-bold leading-none md:text-xl">{score.score}</p>
          <p className="text-[10px] text-[var(--dark-muted)]">/100</p>
        </div>
        <div className="space-y-2 lg:space-y-1">
          <div className="md:flex md:items-center md:gap-2 lg:gap-1.5">
            <Badge variant="dark">{getScoreBadge(score.level)}</Badge>
            <h2 className="text-3xl font-bold md:text-xl">Tu score de junta</h2>
          </div>
          <p className="text-base text-[var(--dark-muted)] md:text-sm">Pagos a tiempo, ciclos completados y referencias acumulan tu reputación financiera en la plataforma.</p>
        </div>
        <div className="space-y-1 md:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-[var(--dark-muted)]">Progreso a {score.nextLevel ?? 'Élite'}</p>
            <p className="text-[11px] text-[var(--dark-muted)]">
              <span className="text-sm font-medium text-white">{score.score}</span>{' '}
              / {score.nextLevel ? score.score + score.pointsToNextLevel : 100} pts
            </p>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-emerald-400 transition-[width] duration-700" style={{ width: `${score.progressToNextLevel}%` }} />
          </div>
        </div>
        {score.warnings[0] && <p className="text-xs text-amber-300 md:col-span-2">{score.warnings[0]}</p>}
        <div className="grid grid-cols-3 border-t border-white/10 pt-3 md:col-span-2 lg:pt-2.5">
          <div className="px-2 text-center first:pl-0 md:text-left lg:text-center">
            <p className="text-xs text-[var(--dark-muted)]">Pagos a tiempo</p>
            <p className="font-mono text-lg font-bold text-emerald-400">{paymentsOnTime}%</p>
          </div>
          <div className="border-x border-white/10 px-2 text-center md:text-left lg:text-center">
            <p className="text-xs text-[var(--dark-muted)]">Ciclos completados</p>
            <p className="font-mono text-lg font-bold text-white">{completedCycles}</p>
          </div>
          <div className="px-2 text-center last:pr-0 md:text-left lg:text-center">
            <p className="text-xs text-[var(--dark-muted)]">Referidos activos</p>
            <p className="font-mono text-lg font-bold text-white">{referredActive}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function UpcomingPayoutCard({ data }: { data: UpcomingPayoutData }) {
  return (
    <Link href={`/juntas/${data.juntaId}`}>
      <Card tint="green" hover className="p-4">
        <p className="text-sm font-semibold text-[#065f46]">Tu próximo cobro</p>
        <p className="break-words font-mono text-4xl font-bold text-[#065f46] md:text-xl">{money(data.amount)}</p>
        <p className="text-sm text-[#065f46]/80">
          Turno #{data.ronda} · {data.juntaNombre} · {data.fecha ? format(data.fecha, 'dd MMM yyyy', { locale: es }) : 'fecha por confirmar'}
        </p>
      </Card>
    </Link>
  );
}

function InviteAndEarnCard({ referralCode }: { referralCode: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(referralCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const whatsappText = encodeURIComponent(
    `Únete a Juntealo con mi código ${referralCode} y organiza tu junta fácil y seguro 👉 juntealo.com`
  );

  return (
    <Card className="p-3">
      <p className="mb-2 flex items-center gap-1.5 text-sm text-muted">
        <Trophy size={14} strokeWidth={1.8} />
        Refiere amigos y construye tu reputación financiera
      </p>
      <div className="flex items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate rounded-[var(--r-sm)] border border-border bg-accent-bg px-3 py-2 font-mono text-sm font-bold tracking-widest text-fg">
          {referralCode}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--r-sm)] border border-border bg-white px-2.5 py-2 text-xs font-medium text-fg transition-colors hover:border-accent hover:text-accent"
        >
          <Copy size={12} />
          {copied ? 'Copiado' : 'Copiar'}
        </button>
        <a
          href={`https://wa.me/?text=${whatsappText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--r-sm)] border border-green bg-green px-2.5 py-2 text-xs font-medium text-white transition-colors hover:opacity-90"
        >
          <MessageCircle size={12} />
          WhatsApp
        </a>
      </div>
    </Card>
  );
}

function ContributionSummaryCards({ summary }: { summary: ContributionSummaryData }) {
  return (
    <Card className="border-0 bg-accent p-5 text-white md:rounded-xl md:p-4 lg:p-3.5">
      <p className="text-sm text-white/70">Total aportado</p>
      <p className="break-words font-mono text-4xl font-bold md:text-xl">{money(summary.totalAportado)}</p>
      <p className="text-sm text-white/70">{summary.periodLabel}</p>
    </Card>
  );
}

function JuntaSkeletonItem() {
  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-slate-200" />
        <div className="space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-48 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
      <div className="space-y-2 text-right">
        <div className="ml-auto h-4 w-20 animate-pulse rounded bg-slate-200" />
        <div className="ml-auto h-3 w-14 animate-pulse rounded bg-slate-200" />
      </div>
    </Card>
  );
}

function JuntaListItem({ item }: { item: JuntaCardData }) {
  return (
    <Link href={`/juntas/${item.id}`}>
      <Card hover className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <JuntaAvatar nombre={item.nombre} />
          <div className="min-w-0">
            <p className="break-words font-semibold text-fg">{item.nombre}</p>
            <p className="break-words text-sm text-muted">{item.miembros} integrantes · {money(item.cuota)}/{item.frecuencia} · {item.tipo === 'incentivo' ? 'con incentivos' : 'normal'}</p>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <p className="font-semibold text-accent">{item.turno ? `Turno #${item.turno}` : 'Turno pendiente'}</p>
          <p className="text-xs text-muted">{item.nextDate ? format(item.nextDate, 'dd MMM', { locale: es }) : 'Sin fecha'}</p>
          <Badge variant={item.status === 'pendiente' ? 'pendiente' : 'pagada'}>
            {item.status === 'pendiente' ? 'Pago pendiente' : 'Al día'}
          </Badge>
        </div>
      </Card>
    </Link>
  );
}

function ActiveJuntasSection({ active, history, isLoading, loadError }: { active: JuntaCardData[]; history: JuntaCardData[]; isLoading: boolean; loadError: string | null }) {
  const [tab, setTab] = useState<'activas' | 'historial'>('activas');
  const data = tab === 'activas' ? active : history;

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 lg:flex-nowrap">
        <h2 className="text-sm font-medium text-fg">Mis juntas activas</h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-[var(--r-sm)] border border-border bg-surface p-0.5">
            <button type="button" onClick={() => setTab('activas')} className={`rounded px-2.5 py-1 text-xs transition-colors ${tab === 'activas' ? 'bg-accent text-white' : 'text-muted'}`}>Activas</button>
            <button type="button" onClick={() => setTab('historial')} className={`rounded px-2.5 py-1 text-xs transition-colors ${tab === 'historial' ? 'bg-accent text-white' : 'text-muted'}`}>Historial</button>
          </div>
          <Link className="text-xs font-medium text-accent" href="/juntas">Ver todas →</Link>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <JuntaSkeletonItem key={i} />)}
        </div>
      ) : loadError ? (
        <Card className="py-4 text-center text-sm text-destructive">{loadError}</Card>
      ) : data.length === 0 ? (
        tab === 'activas' ? (
          <Card className="py-4 text-center text-sm text-muted">
            <p>Aún no tienes juntas activas.</p>
            <div className="mt-3 flex justify-center gap-2">
              <Link href="/juntas/new"><Button size="sm">Crear nueva junta</Button></Link>
              <Link href="/juntas"><Button size="sm" variant="outline">Explorar juntas</Button></Link>
            </div>
          </Card>
        ) : (
          <Card className="py-4 text-center text-sm text-muted">Todavía no tienes historial de juntas finalizadas.</Card>
        )
      ) : (
        <div className="space-y-2">
          {data.map((item) => <JuntaListItem key={`${tab}-${item.id}`} item={item} />)}
        </div>
      )}
    </section>
  );
}

function WeeklyGoalsCard({ goals }: { goals: WeeklyGoal[] }) {
  const completedCount = goals.filter((g) => g.status === 'completed').length;
  return (
    <Card className="p-4 lg:p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-fg">Objetivos de la semana</p>
        <p className="leading-none text-muted">
          <span className="text-sm font-medium text-fg">{completedCount}</span>
          <span className="text-[11px]">/{goals.length}</span>
        </p>
      </div>
      <div className="flex flex-col">
        {goals.map((goal, i) => (
          <div
            key={goal.label}
            className={`flex items-center gap-2.5 py-2.5 ${i < goals.length - 1 ? 'border-b border-border' : ''} ${goal.status === 'unavailable' ? 'opacity-40' : ''}`}
          >
            {goal.status === 'completed'
              ? <CheckCircle2 size={16} className="shrink-0 text-green" strokeWidth={1.8} />
              : <Circle size={16} className="shrink-0 text-muted" strokeWidth={1.8} />
            }
            <p className={`flex-1 text-sm ${goal.status === 'completed' ? 'text-muted line-through' : 'text-fg'}`}>
              {goal.label}
            </p>
            {goal.status !== 'unavailable' && (
              <p className="shrink-0 text-xs font-medium text-green">+{goal.points}</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { juntas, schedules, payments, members, payouts, setData } = useAppStore();
  const safeJuntas = useMemo(() => (Array.isArray(juntas) ? juntas : []), [juntas]);
  const safeSchedules = useMemo(() => (Array.isArray(schedules) ? schedules : []), [schedules]);
  const safePayments = useMemo(() => (Array.isArray(payments) ? payments : []), [payments]);
  const safeMembers = useMemo(() => (Array.isArray(members) ? members : []), [members]);
  const safePayouts = useMemo(() => (Array.isArray(payouts) ? payouts : []), [payouts]);
  const [notifPayload, setNotifPayload] = useState<{
    juntas: Junta[];
    schedules: PaymentSchedule[];
    payments: Payment[];
    payouts: Payout[];
  } | null>(null);
  const userId = user?.id ?? '';

  const [juntasIsLoading, setJuntasIsLoading] = useState(true);
  const [juntasLoadError, setJuntasLoadError] = useState<string | null>(null);
  const [localJuntas, setLocalJuntas] = useState<Junta[]>([]);
  const [localMembers, setLocalMembers] = useState<JuntaMember[]>([]);
  const [localSchedules, setLocalSchedules] = useState<PaymentSchedule[]>([]);

  const [claimedMissions, setClaimedMissions] = useState<ClaimedMission[]>([]);
  const [referralStats, setReferralStats] = useState<ReferralStats>({ total: 0, active: 0 });

  const myJuntaIds = useMemo(
    () => (user ? getMyJuntaIds(user.id, safeJuntas, safeMembers) : []),
    [safeJuntas, safeMembers, user]
  );
  const globalRacha = useMemo(
    () => (user ? computeGlobalRacha({ userId: user.id, payments: safePayments, schedules: safeSchedules, juntaIds: myJuntaIds }) : null),
    [user, safePayments, safeSchedules, myJuntaIds]
  );
  // Fresh fetch for payment notifications — never relies on stale Zustand data.
  // Queries from junta_members (not admin_id) so both creators and participants are covered.
  useEffect(() => {
    if (!user?.id) return;
    fetchUserPaymentNotifications(user.id).then((result) => {
      if (!result.ok) return;
      setNotifPayload(result.data);
    });
  }, [user?.id]);

  useEffect(() => {
    if (!userId) return;
    fetchClaimedMissions(userId).then(setClaimedMissions);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchReferralStats(userId).then(setReferralStats);
  }, [userId]);

  useEffect(() => {
    if (!globalRacha || !userId) return;
    const milestones = [4, 8, 12] as const;
    for (const hito of milestones) {
      if (globalRacha.semanasActual >= hito) {
        recordRachaMilestone({ profileId: userId, juntaId: null, hitoSemanas: hito });
      }
    }
  }, [globalRacha, globalRacha?.semanasActual, userId]);

  // Fetch propio del dashboard — independiente del layout y del store global.
  // Garantiza que "Mis juntas activas" se cargue al entrar directamente al dashboard
  // sin depender de haber visitado otra pantalla primero.
  useEffect(() => {
    if (!user?.id) return;

    setJuntasIsLoading(true);
    setJuntasLoadError(null);

    fetchUserJuntaSnapshot(user.id)
      .then((result) => {
        if (!result.ok) {
          if (process.env.NODE_ENV === 'development') {
            console.error('[dashboard:misJuntas] fetch failed', result.message);
          }
          setJuntasLoadError('No pudimos cargar tus juntas. Inténtalo nuevamente.');
          return;
        }
        const { juntas: fetchedJuntas, members: fetchedMembers, schedules: fetchedSchedules, payments: fetchedPayments, payouts: fetchedPayouts } = result.data;

        if (process.env.NODE_ENV === 'development') {
          const activeAfterFilters = fetchedJuntas.filter(
            (junta) => !['cerrada', 'bloqueada', 'eliminada'].includes(junta.estado)
              && !junta.bloqueada
              && !junta.deleted_at
          );
          console.debug('[dashboard:misJuntas] query and filters', {
            authenticatedUser: user.id,
            result: fetchedJuntas,
            error: null,
            beforeFilters: fetchedJuntas.length,
            afterActiveFilters: activeAfterFilters.length
          });
        }

        setLocalJuntas(fetchedJuntas);
        setLocalMembers(fetchedMembers);
        setLocalSchedules(fetchedSchedules);

        if (fetchedJuntas.length > 0) {
          setData({ juntas: fetchedJuntas, members: fetchedMembers, schedules: fetchedSchedules, payments: fetchedPayments, payouts: fetchedPayouts });
        }
      })
      .finally(() => {
        setJuntasIsLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const paymentAlert = useMemo(() => {
    if (notifPayload) {
      const juntaIds = notifPayload.juntas.map((j) => j.id);
      // Prefer store payments for the current user — they are updated immediately after
      // submitPayment (optimistic), while notifPayload may be stale when the user
      // navigates back to the dashboard from the payment page without a full remount.
      const storeUserPayments = safePayments.filter(
        (p) => p.profile_id === userId && juntaIds.includes(p.junta_id)
      );
      const storeIds = new Set(storeUserPayments.map((p) => p.id));
      const mergedPayments = [
        ...storeUserPayments,
        ...notifPayload.payments.filter((p) => !storeIds.has(p.id)),
      ];
      // Use notifPayload.payouts (from SECURITY DEFINER RPC) for turn detection.
      // safePayouts from the store may be empty if the payouts table RLS blocks
      // direct queries for regular members, which would cause currentCuota = 1
      // and allow past-turn vencida schedules to incorrectly win the banner.
      const alertPayouts = notifPayload.payouts.length > 0 ? notifPayload.payouts : safePayouts;

      if (process.env.NODE_ENV === 'development') {
        console.debug('[PAYMENT ALERT] activeMemberships (via RPC)', {
          source: 'notifPayload',
          activeJuntas: notifPayload.juntas.map((j) => ({ id: j.id, nombre: j.nombre, estado: j.estado })),
          candidateSchedules: notifPayload.schedules.map((s) => ({ id: s.id, juntaId: s.junta_id, cuotaNumero: s.cuota_numero, estado: s.estado, monto: s.monto, fechaVencimiento: s.fecha_vencimiento })),
          validPayments: mergedPayments.map((p) => ({ id: p.id, juntaId: p.junta_id, scheduleId: p.schedule_id, estado: p.estado, paymentStatus: p.payment_status })),
          payoutsDelivered: alertPayouts.map((po) => ({ id: po.id, juntaId: po.junta_id, rondaNumero: po.ronda_numero, entregadoEn: po.entregado_en })),
        });
      }

      return getPaymentAlertState({
        userId,
        myJuntaIds: juntaIds,
        juntas: notifPayload.juntas,
        schedules: notifPayload.schedules,
        payments: mergedPayments,
        payouts: alertPayouts,
        members: safeMembers
      });
    }

    // Store-only fallback (before RPC resolves): mirror RPC filters exactly.
    // active memberships (estado='activo') → active juntas (estado='activa', not deleted/blocked)
    const activeMemberships = safeMembers.filter((m) => m.profile_id === userId && m.estado === 'activo');
    const activeMemberJuntaIds = new Set(activeMemberships.map((m) => m.junta_id));
    const storeAlertJuntas = safeJuntas.filter(
      (j) => activeMemberJuntaIds.has(j.id) && j.estado === 'activa' && !j.deleted_at && !j.bloqueada
    );
    const storeAlertJuntaIds = storeAlertJuntas.map((j) => j.id);
    const candidateSchedules = safeSchedules.filter((s) => storeAlertJuntaIds.includes(s.junta_id));
    const relevantPayments = safePayments.filter((p) => p.profile_id === userId && storeAlertJuntaIds.includes(p.junta_id));

    if (process.env.NODE_ENV === 'development') {
      console.debug('[PAYMENT ALERT] activeMemberships (store fallback)', {
        source: 'storeOnly',
        userId,
        activeMemberships: activeMemberships.map((m) => ({ juntaId: m.junta_id, estado: m.estado })),
        activeJuntas: storeAlertJuntas.map((j) => ({ id: j.id, nombre: j.nombre, estado: j.estado, deletedAt: j.deleted_at, bloqueada: j.bloqueada })),
        candidateSchedules: candidateSchedules.map((s) => ({ id: s.id, juntaId: s.junta_id, cuotaNumero: s.cuota_numero, estado: s.estado, monto: s.monto })),
        validPayments: relevantPayments.map((p) => ({ id: p.id, juntaId: p.junta_id, scheduleId: p.schedule_id, estado: p.estado, paymentStatus: p.payment_status })),
        safePayoutsCount: safePayouts.length,
      });
    }

    return getPaymentAlertState({
      userId,
      myJuntaIds: storeAlertJuntaIds,
      juntas: storeAlertJuntas,
      schedules: candidateSchedules,
      payments: relevantPayments,
      payouts: safePayouts,
      members: safeMembers
    });
  }, [notifPayload, userId, safeMembers, safeJuntas, safeSchedules, safePayments, safePayouts]);

  if (!user) return <Card>Necesitas iniciar sesión para ver tu dashboard.</Card>;

  const scoreStats = buildJuntaScoreStatsFromDomain({
    userId: user.id,
    juntas: safeJuntas,
    members: safeMembers,
    payments: safePayments,
    schedules: safeSchedules,
    successfulReferrals: referralStats.active
  });

  const currentWeekKey = getWeekKey();
  const missionBonusThisWeek = claimedMissions
    .filter((m) => m.week_key === currentWeekKey)
    .reduce((sum, m) => sum + m.bonus_points, 0);

  const score = getUserJuntaScore(user.id, scoreStats, missionBonusThisWeek);

  const upcomingPayout = getUpcomingPayout({
    userId: user.id,
    payouts: safePayouts,
    schedules: safeSchedules,
    juntas: safeJuntas
  });

  const contributionSummary = getCurrentCycleContributionSummary({
    userId: user.id,
    juntas: safeJuntas,
    payments: safePayments,
    schedules: safeSchedules,
    myJuntaIds
  });

  // Incluye tanto las juntas creadas por el usuario como aquellas en las que participa.
  const localMyJuntaIds = getMyJuntaIds(user.id, localJuntas, localMembers);
  const memberCountByJunta = getActiveMemberCountByJunta(localJuntas, localMembers);

  const activeJuntas = getActiveJuntas({
    juntas: localJuntas,
    myJuntaIds: localMyJuntaIds,
    members: localMembers,
    schedules: localSchedules,
    userId: user.id,
    memberCountByJunta
  });

  const historyJuntas = getJuntaHistory({
    juntas: localJuntas,
    myJuntaIds: localMyJuntaIds,
    memberCountByJunta
  });

  const approvedCount = scoreStats.onTimePaymentsRecent + scoreStats.onTimePaymentsLifetime;
  const lateCount = scoreStats.latePaymentsRecent + scoreStats.defaultPaymentsRecent;
  const paymentRate = approvedCount + lateCount > 0 ? Math.round((approvedCount / (approvedCount + lateCount)) * 100) : 0;
  const completedCycles = safeJuntas.filter((junta) => myJuntaIds.includes(junta.id) && junta.estado === 'cerrada').length;

  const hasActiveJuntas = activeJuntas.length > 0;
  const weeklyGoals: WeeklyGoal[] = [
    hasActiveJuntas
      ? { label: 'Completa un ciclo', points: MISSION_REWARDS.completeCycle, status: completedCycles > 0 ? 'completed' : 'pending' }
      : { label: 'Únete a tu primera junta', points: MISSION_REWARDS.joinFirstJunta, status: 'pending' },
    {
      label: 'Confirma tu cuota',
      points: MISSION_REWARDS.payOnTimeThisWeek,
      status: !hasActiveJuntas ? 'unavailable' : (scoreStats.onTimePaymentsThisWeek > 0 ? 'completed' : 'pending')
    },
    {
      label: 'Invita a un amigo',
      points: MISSION_REWARDS.referOneActiveMember,
      status: referralStats.active > 0 ? 'completed' : 'pending'
    }
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-6 lg:space-y-3">
      {paymentAlert.status !== 'none' && paymentAlert.status !== 'paid' && <PendingPaymentBanner data={paymentAlert} />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(280px,3fr)] lg:items-start lg:gap-3">
        <div className="space-y-4 lg:flex lg:flex-col lg:gap-3 lg:space-y-0">
          <div className="contents lg:order-1 lg:block">
            <JuntaScoreCard
              score={score}
              paymentsOnTime={paymentRate}
              completedCycles={completedCycles}
              referredActive={referralStats.active}
            />
          </div>

          {globalRacha && (
            <div className="contents lg:order-4 lg:block">
              <RachaCard
                semanasActual={globalRacha.semanasActual}
                recordPersonal={globalRacha.recordPersonal}
                proximoHito={globalRacha.proximoHito}
                estado={globalRacha.estado}
                horasRestantes={globalRacha.horasRestantes}
              />
            </div>
          )}

          {upcomingPayout && (
            <div className="contents lg:order-5 lg:block">
              <UpcomingPayoutCard data={upcomingPayout} />
            </div>
          )}

          <div className="contents lg:order-2 lg:block">
            <ActiveJuntasSection active={activeJuntas} history={historyJuntas} isLoading={juntasIsLoading} loadError={juntasLoadError} />
          </div>
        </div>

        <aside className="space-y-4 lg:space-y-3">
          <ContributionSummaryCards summary={contributionSummary} />

          <WeeklyGoalsCard goals={weeklyGoals} />

          {user.referral_code && (
            <InviteAndEarnCard referralCode={user.referral_code} />
          )}
        </aside>
      </div>
    </div>
  );
}
