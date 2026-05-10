'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getPaymentAlertState, type PaymentAlertState } from '@/lib/payment-alert';
import { getJuntaEngagementLayer, type JuntaMission, type LevelUnlocks } from '@/services/junta-engagement.service';
import { fetchProfilesByIds } from '@/services/profile.service';
import { fetchUserPaymentNotifications, fetchUserJuntaSnapshot } from '@/services/juntas.repository';
import {
  buildJuntaScoreStatsFromDomain,
  getScoreBadge,
  type UserJuntaScoreResult,
  getUserJuntaScore
} from '@/services/junta-score.service';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
import { Junta, JuntaMember, Payment, PaymentSchedule, Payout, Profile } from '@/types/domain';
import { parseCalendarDate } from '@/lib/calendar-date';
import { getActiveMemberCountByJunta } from '@/lib/junta-members';
import { JuntaAvatar } from '@/components/junta-avatar';
import { CheckCircle2, RefreshCw, Users as UsersIcon, Star } from 'lucide-react';
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

type NextLevelData = {
  title: string;
  benefitText: string;
  currentScore: number;
  targetScore: number;
  mission: JuntaMission;
  warning: string | null;
  unlocks: LevelUnlocks | null;
  gainText: string;
  lossText: string;
};

function money(value: number) {
  return `S/ ${Math.round(value).toLocaleString('es-PE')}`;
}

function getDisplayName(nombre?: string, email?: string) {
  const fromNombre = (nombre ?? '').trim();
  if (fromNombre) return fromNombre;
  const fromEmail = (email ?? '').split('@')[0]?.replace(/[._-]+/g, ' ').trim();
  if (fromEmail) return fromEmail.replace(/\b\w/g, (char) => char.toUpperCase());
  return 'Miembro';
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'JD';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
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
  payments: Payment[];
  schedules: PaymentSchedule[];
  myJuntaIds: string[];
}): ContributionSummaryData {
  const approvedPayments = params.payments.filter((payment) => payment.profile_id === params.userId && payment.estado === 'approved');
  const totalAportado = approvedPayments.reduce((acc, payment) => acc + payment.monto, 0);
  const periodCount = params.schedules.filter((schedule) => params.myJuntaIds.includes(schedule.junta_id)).length;

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
    .filter((junta) => junta.estado !== 'cerrada' && junta.estado !== 'eliminada' && !junta.bloqueada)
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
        miembros: params.memberCountByJunta.get(junta.id) ?? Number(junta.integrantes_actuales ?? 0),
        cuota: Number(junta.cuota_base ?? junta.monto_cuota ?? 0),
        frecuencia: junta.frecuencia_pago,
        tipo: junta.tipo_junta ?? 'normal',
        turno,
        nextDate: nextSchedule ? parseCalendarDate(nextSchedule.fecha_vencimiento) : null,
        status: hasPending ? 'pendiente' : 'al_dia'
      };
    });
}

function getJuntaHistory(params: { juntas: Junta[]; myJuntaIds: string[] }): JuntaCardData[] {
  return params.juntas
    .filter((junta) => params.myJuntaIds.includes(junta.id))
    .filter((junta) => junta.estado === 'cerrada' || Boolean(junta.bloqueada))
    .map((junta) => ({
      id: junta.id,
      nombre: junta.nombre,
      miembros: Number(junta.integrantes_actuales ?? junta.participantes_max ?? 0),
      cuota: Number(junta.cuota_base ?? junta.monto_cuota ?? 0),
      frecuencia: junta.frecuencia_pago,
      tipo: junta.tipo_junta ?? 'normal',
      turno: null,
      nextDate: null,
      status: 'al_dia' as const
    }));
}

function getNextLevelProgress(score: UserJuntaScoreResult, engagement: ReturnType<typeof getJuntaEngagementLayer>): NextLevelData {
  const nextLevel = engagement.nextLevel ?? 'Élite';
  const unlockCopy = engagement.nextLevelUnlocks
    ? `Límite ${engagement.nextLevelUnlocks.maxJuntaMembers} miembros · aporte hasta S/ ${engagement.nextLevelUnlocks.maxContributionPerRound.toLocaleString('es-PE')}.`
    : 'Ya tienes el nivel máximo desbloqueado.';
  return {
    title: `Próximo nivel: ${nextLevel}`,
    benefitText: `+${engagement.pointsRemainingToNextLevel} pts para desbloquear: ${unlockCopy}`,
    currentScore: score.score,
    targetScore: score.nextLevel ? score.score + score.pointsToNextLevel : 100,
    mission: engagement.featuredMission,
    warning: engagement.levelDropWarning,
    unlocks: engagement.nextLevelUnlocks,
    gainText: engagement.causeAndEffect.gainIfPayToday,
    lossText: engagement.causeAndEffect.lossIfLateToday
  };
}

function DashboardHeader({ displayName }: { displayName: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
          {getInitials(displayName)}
        </div>
        <div>
          <p className="text-sm text-muted">Buenos días</p>
          <h1 className="text-2xl font-semibold text-fg">{displayName}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link href="/account?tab=notifications" aria-label="Ir a notificaciones" className="rounded-full border border-border bg-surface p-2 text-lg">
          🔔
        </Link>
      </div>
    </div>
  );
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
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/70">⏺</div>
            <div>
              <p className={`text-sm font-semibold ${titleToneClass}`}>{data.title}</p>
              <p className={`text-sm ${titleToneClass}`}>{data.subtitle}</p>
            </div>
          </div>
          <p className={`text-sm font-semibold ${ctaToneClass}`}>{ctaLabel}</p>
        </div>
      </Card>
    </Link>
  );
}

function JuntaScoreCard({ score }: { score: UserJuntaScoreResult }) {
  return (
    <Card dark className="text-white">
      <div className="grid gap-4 md:grid-cols-[100px_1fr] md:items-center">
        <div className="mx-auto flex h-24 w-24 flex-col items-center justify-center rounded-full border-[5px] border-emerald-400">
          <p className="font-mono text-4xl font-bold leading-none">{score.score}</p>
          <p className="text-[10px] text-[var(--dark-muted)]">/100</p>
        </div>
        <div className="space-y-2">
          <Badge variant="dark">{getScoreBadge(score.level)}</Badge>
          <h2 className="text-2xl font-bold">Tu score de junta</h2>
          <p className="text-sm text-[var(--dark-muted)]">Pagos a tiempo, ciclos completados y referencias acumulan tu reputación financiera en la plataforma.</p>
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-emerald-400 transition-[width] duration-700" style={{ width: `${score.progressToNextLevel}%` }} />
            </div>
            <p className="text-[11px] text-[var(--dark-muted)]">
              {score.pointsToNextLevel} pts para <span className="font-semibold text-white">{score.nextLevel ?? 'Élite'}</span>
            </p>
          </div>
          {score.warnings[0] && <p className="text-xs text-amber-300">{score.warnings[0]}</p>}
        </div>
      </div>
    </Card>
  );
}

function DashboardKpis({ paymentsOnTime, completedCycles, referredActive }: { paymentsOnTime: number; completedCycles: number; referredActive: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Card className="p-4 text-center">
        <CheckCircle2 className="mx-auto mb-1 text-emerald-400" size={20} strokeWidth={1.5} />
        <p className="font-mono text-3xl font-bold text-green">{paymentsOnTime}%</p>
        <p className="text-sm text-muted">Pagos a tiempo</p>
      </Card>
      <Card className="p-4 text-center">
        <RefreshCw className="mx-auto mb-1 text-slate-400" size={20} strokeWidth={1.5} />
        <p className="font-mono text-3xl font-bold text-fg">{completedCycles}</p>
        <p className="text-sm text-muted">Ciclos completados</p>
      </Card>
      <Card className="p-4 text-center">
        <UsersIcon className="mx-auto mb-1 text-slate-400" size={20} strokeWidth={1.5} />
        <p className="font-mono text-3xl font-bold text-fg">{referredActive}</p>
        <p className="text-sm text-muted">Referidos activos</p>
      </Card>
    </div>
  );
}

function UpcomingPayoutCard({ data }: { data: UpcomingPayoutData }) {
  return (
    <Link href={`/juntas/${data.juntaId}`}>
      <Card tint="green" hover className="p-4">
        <p className="text-sm font-semibold text-[#065f46]">Tu próximo cobro</p>
        <p className="font-mono text-4xl font-bold text-[#065f46]">{money(data.amount)}</p>
        <p className="text-sm text-[#065f46]/80">
          Turno #{data.ronda} · {data.juntaNombre} · {data.fecha ? format(data.fecha, 'dd MMM yyyy', { locale: es }) : 'fecha por confirmar'}
        </p>
      </Card>
    </Link>
  );
}

function ContributionSummaryCards({ summary }: { summary: ContributionSummaryData }) {
  return (
    <Card className="border-0 bg-accent p-5 text-white">
      <p className="text-sm text-white/70">Total aportado</p>
      <p className="font-mono text-4xl font-bold">{money(summary.totalAportado)}</p>
      <p className="text-sm text-white/70">{summary.periodLabel}</p>
    </Card>
  );
}

function JuntaSkeletonItem() {
  return (
    <Card className="flex items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-200" />
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
      <Card hover className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <JuntaAvatar nombre={item.nombre} />
          <div>
            <p className="font-semibold text-fg">{item.nombre}</p>
            <p className="text-sm text-muted">{item.miembros} integrantes · {money(item.cuota)}/{item.frecuencia} · {item.tipo === 'incentivo' ? 'con incentivos' : 'normal'}</p>
          </div>
        </div>
        <div className="text-right">
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

function ActiveJuntasSection({ active, history, isLoading }: { active: JuntaCardData[]; history: JuntaCardData[]; isLoading: boolean }) {
  const [tab, setTab] = useState<'activas' | 'historial'>('activas');
  const data = tab === 'activas' ? active : history;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-fg">Mis juntas activas</h2>
        <Link className="text-sm font-medium text-accent" href="/juntas">Ver todas →</Link>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => setTab('activas')} className={`rounded-[var(--r-sm)] border px-4 py-1.5 text-sm transition-colors ${tab === 'activas' ? 'border-accent text-accent' : 'border-border text-muted'}`}>Activas</button>
        <button type="button" onClick={() => setTab('historial')} className={`rounded-[var(--r-sm)] border px-4 py-1.5 text-sm transition-colors ${tab === 'historial' ? 'border-accent text-accent' : 'border-border text-muted'}`}>Historial</button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <JuntaSkeletonItem key={i} />)}
        </div>
      ) : data.length === 0 ? (
        <Card className="p-5 text-sm text-muted">{tab === 'activas' ? 'Aún no tienes juntas activas. Únete o crea una junta para empezar.' : 'Todavía no tienes historial de juntas finalizadas.'}</Card>
      ) : (
        <div className="space-y-2">
          {data.map((item) => <JuntaListItem key={`${tab}-${item.id}`} item={item} />)}
        </div>
      )}
    </section>
  );
}

function NextLevelSection({ data }: { data: NextLevelData }) {
  const progressPct = Math.round((data.currentScore / data.targetScore) * 100);
  const missionPct = Math.round((data.mission.progressCurrent / data.mission.progressTarget) * 100);

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-fg">{data.title}</h2>
      <Card tint="blue" className="p-4">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-white"><Star size={16} strokeWidth={1.5} /></div>
          <div className="flex-1">
            <p className="text-sm text-accent-dark">{data.benefitText}</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-accent-bg">
                <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${progressPct}%` }} />
              </div>
              <p className="text-[11px] font-medium text-accent">{data.currentScore}/{data.targetScore}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <p className="text-sm font-semibold text-fg">{data.mission.title}</p>
        <p className="mt-1 text-sm text-fg/80">{data.mission.description}</p>
        <p className="mt-1 text-xs text-green">Recompensa: +{data.mission.rewardPoints} pts</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-muted transition-[width] duration-700" style={{ width: `${missionPct}%` }} />
          </div>
          <p className="text-[11px] text-muted">{data.mission.progressCurrent}/{data.mission.progressTarget}</p>
        </div>
        <p className="mt-3 text-xs text-accent">{data.gainText}</p>
        <p className="mt-1 text-xs text-amber">{data.lossText}</p>
        {data.warning && <p className="mt-2 text-xs font-medium text-destructive">{data.warning}</p>}
        {data.unlocks && (
          <p className="mt-2 text-xs text-muted">
            Próximos desbloqueos: {data.unlocks.maxJuntaMembers} integrantes · aporte hasta S/ {data.unlocks.maxContributionPerRound.toLocaleString('es-PE')} · {data.unlocks.incentiveJuntasEnabled ? 'juntas con incentivo' : 'sin juntas con incentivo'}.
          </p>
        )}
      </Card>
    </section>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { juntas, schedules, payments, members, payouts, isDataReady, setData } = useAppStore();
  const safeJuntas = useMemo(() => (Array.isArray(juntas) ? juntas : []), [juntas]);
  const safeSchedules = useMemo(() => (Array.isArray(schedules) ? schedules : []), [schedules]);
  const safePayments = useMemo(() => (Array.isArray(payments) ? payments : []), [payments]);
  const safeMembers = useMemo(() => (Array.isArray(members) ? members : []), [members]);
  const safePayouts = useMemo(() => (Array.isArray(payouts) ? payouts : []), [payouts]);
  const [profilesById, setProfilesById] = useState<Record<string, Profile>>({});
  const [notifPayload, setNotifPayload] = useState<{
    juntas: Junta[];
    schedules: PaymentSchedule[];
    payments: Payment[];
    payouts: Payout[];
  } | null>(null);
  const userId = user?.id ?? '';

  const [juntasIsLoading, setJuntasIsLoading] = useState(true);
  const [localJuntas, setLocalJuntas] = useState<Junta[]>([]);
  const [localMembers, setLocalMembers] = useState<JuntaMember[]>([]);
  const [localSchedules, setLocalSchedules] = useState<PaymentSchedule[]>([]);

  const myJuntaIds = useMemo(
    () => (user ? getMyJuntaIds(user.id, safeJuntas, safeMembers) : []),
    [safeJuntas, safeMembers, user]
  );
  const globalRacha = useMemo(
    () => (user ? computeGlobalRacha({ userId: user.id, payments: safePayments, schedules: safeSchedules, juntaIds: myJuntaIds }) : null),
    [user, safePayments, safeSchedules, myJuntaIds]
  );
  const displayName = user ? getDisplayName(user.nombre, user.email) : 'Miembro';

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
    if (!user) return;
    const memberProfileIds = safeMembers
      .filter((member) => myJuntaIds.includes(member.junta_id))
      .map((member) => member.profile_id);
    const ids = Array.from(new Set([userId, ...memberProfileIds]));

    fetchProfilesByIds(ids).then((result) => {
      if (!result.ok) return;
      const mapped = result.data.reduce<Record<string, Profile>>((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {});
      if (!mapped[userId]) mapped[userId] = user;
      setProfilesById(mapped);
    });
  }, [myJuntaIds, safeMembers, user, userId]);

  // Fetch propio del dashboard — independiente del layout y del store global.
  // Garantiza que "Mis juntas activas" se cargue al entrar directamente al dashboard
  // sin depender de haber visitado otra pantalla primero.
  useEffect(() => {
    if (!user?.id) return;

    setJuntasIsLoading(true);

    fetchUserJuntaSnapshot(user.id)
      .then((result) => {
        const { juntas: fetchedJuntas, members: fetchedMembers, schedules: fetchedSchedules, payments: fetchedPayments, payouts: fetchedPayouts } = result.data;

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
        payouts: alertPayouts
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
      payouts: safePayouts
    });
  }, [notifPayload, userId, safeMembers, safeJuntas, safeSchedules, safePayments, safePayouts]);

  if (!user) return <Card>Necesitas iniciar sesión para ver tu dashboard.</Card>;

  const scoreStats = buildJuntaScoreStatsFromDomain({
    userId: user.id,
    juntas: safeJuntas,
    members: safeMembers,
    payments: safePayments,
    schedules: safeSchedules
  });

  const score = getUserJuntaScore(user.id, scoreStats);
  const engagement = getJuntaEngagementLayer({
    userId: user.id,
    score,
    stats: scoreStats
  });

  const upcomingPayout = getUpcomingPayout({
    userId: user.id,
    payouts: safePayouts,
    schedules: safeSchedules,
    juntas: safeJuntas
  });

  const contributionSummary = getCurrentCycleContributionSummary({
    userId: user.id,
    payments: safePayments,
    schedules: safeSchedules,
    myJuntaIds
  });

  // "Mis juntas activas" usa datos del fetch propio (no del store global)
  // Solo incluye juntas donde el usuario es miembro activo — NO juntas donde solo es admin/creador.
  const localMyJuntaIds = localMembers
    .filter((m) => m.profile_id === user.id && m.estado !== 'retirado')
    .map((m) => m.junta_id)
    .filter((id, i, arr) => arr.indexOf(id) === i);
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
    myJuntaIds: localMyJuntaIds
  });

  const approvedCount = scoreStats.onTimePaymentsRecent + scoreStats.onTimePaymentsLifetime;
  const lateCount = scoreStats.latePaymentsRecent + scoreStats.defaultPaymentsRecent;
  const paymentRate = approvedCount + lateCount > 0 ? Math.round((approvedCount / (approvedCount + lateCount)) * 100) : 0;
  const completedCycles = safeJuntas.filter((junta) => myJuntaIds.includes(junta.id) && junta.estado === 'cerrada').length;
  const nextLevel = getNextLevelProgress(score, engagement);

  return (
    <div className="space-y-5">
      <DashboardHeader displayName={displayName} />

      {paymentAlert.status !== 'none' && paymentAlert.status !== 'paid' && <PendingPaymentBanner data={paymentAlert} />}

      <JuntaScoreCard score={score} />

      {globalRacha && (
        <RachaCard
          semanasActual={globalRacha.semanasActual}
          recordPersonal={globalRacha.recordPersonal}
          proximoHito={globalRacha.proximoHito}
          estado={globalRacha.estado}
          horasRestantes={globalRacha.horasRestantes}
        />
      )}

      <DashboardKpis paymentsOnTime={paymentRate} completedCycles={completedCycles} referredActive={scoreStats.successfulReferrals} />

      {upcomingPayout && <UpcomingPayoutCard data={upcomingPayout} />}

      <ContributionSummaryCards summary={contributionSummary} />

      <ActiveJuntasSection active={activeJuntas} history={historyJuntas} isLoading={juntasIsLoading} />

      <NextLevelSection data={nextLevel} />

      <div className="flex gap-2">
        <Link href="/juntas/new"><Button>Crear nueva junta</Button></Link>
        <Link href="/juntas"><Button variant="outline">Explorar juntas</Button></Link>
      </div>
    </div>
  );
}
