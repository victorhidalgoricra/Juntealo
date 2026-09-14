'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
import { activateJuntaIfReady, confirmPayout, deleteDraftJunta, fetchAvailableJuntas, fetchJuntaActiveMembers, fetchJuntaById, fetchMyActiveMembership, fetchPaymentsByJuntaId, fetchPayoutsByJuntaId, fetchSchedulesByJuntaId, joinJuntaAsParticipant, sendPaymentReminder, setJuntaAssignmentMode, updateJuntaMemberTurns, updatePaymentStatus } from '@/services/juntas.repository';
import { fetchGlobalRanking } from '@/services/ranking.service';
import { calcularSimulacionJunta } from '@/services/incentive.service';
import { Junta } from '@/types/domain';
import { formatIncentiveLabel, getAvatarColor, getInitial } from '@/lib/profile-display';
import { isJuntaActive } from '@/lib/junta-status';
import { APP_BUSINESS_TIMEZONE, isJuntaBlockedByDeadline } from '@/lib/junta-blocking';
import { formatCalendarDate } from '@/lib/calendar-date';
import { getActiveMembersForJunta } from '@/lib/junta-members';
import {
  getCurrentWeekSummary,
  getPaidParticipants,
  getPendingPayers,
  getValidatingParticipants,
  getTurnSchedule,
  getUserPersonalJuntaView,
  WeeklyMemberRow
} from '@/lib/junta-detail-view';
import { RachaCard } from '@/components/ui/racha-card';
import { JuntaAvatar } from '@/components/junta-avatar';
import { computeJuntaRacha } from '@/lib/racha';
import { CalendarClock, CheckCircle2, Clock3, Copy, Landmark, Plus, Share2, Sparkles, WalletCards } from 'lucide-react';

type MainView = 'general' | 'personal';
type GeneralTab = 'integrantes' | 'cronograma' | 'pagos' | 'turnos';

function JuntaScoreBadge({ score }: { score: number | null }) {
  return <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">{score == null ? 'Score no disponible' : `Score ${score}`}</span>;
}

function KpiCard({ icon: Icon, label, value, tone = 'blue' }: { icon: typeof WalletCards; label: string; value: string; tone?: 'blue' | 'green' | 'amber' | 'violet' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600'
  };
  return (
    <Card className="flex min-h-[82px] items-center gap-3 p-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}><Icon size={17} /></span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium text-slate-500">{label}</p>
        <p className="truncate text-xl font-bold tracking-tight text-slate-900">{value}</p>
      </div>
    </Card>
  );
}

function statusClass(status: string) {
  if (status === 'Pagado' || status === 'Entregado') return 'bg-emerald-100 text-emerald-700';
  if (status === 'Validando' || status === 'En curso') return 'bg-blue-100 text-blue-700';
  if (status === 'Recibe') return 'bg-violet-100 text-violet-700';
  if (status === 'Vencido' || status === 'Rechazado') return 'bg-rose-100 text-rose-700';
  return 'bg-amber-100 text-amber-700';
}

function JuntaPaymentStatusRow({ row, showPayAction, onPay }: { row: WeeklyMemberRow; showPayAction?: boolean; onPay?: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${getAvatarColor(row.displayName)}`}>{getInitial(row.displayName)}</div>
        <div className="min-w-0">
          <p className="break-words text-sm font-medium">{row.displayName}</p>
          <p className="text-xs text-slate-500">Turno #{row.turno} · S/{row.amount.toFixed(0)}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 sm:items-center sm:justify-end">
        <JuntaScoreBadge score={row.score} />
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass(row.status)}`}>{row.status}</span>
        {showPayAction && row.isCurrentUser && (row.status === 'Pendiente' || row.status === 'Rechazado' || row.status === 'Vencido') && (
          <Button onClick={onPay}>Pagar S/{row.amount.toFixed(0)} →</Button>
        )}
      </div>
    </div>
  );
}

export default function JuntaDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const { juntas, payments, schedules, payouts, setData } = useAppStore();

  const [mainView, setMainView] = useState<MainView>('general');
  const [generalTab, setGeneralTab] = useState<GeneralTab>(() => {
    const tabParam = searchParams.get('tab');
    const valid: GeneralTab[] = ['integrantes', 'cronograma', 'pagos', 'turnos'];
    return valid.includes(tabParam as GeneralTab) ? (tabParam as GeneralTab) : 'integrantes';
  });
  const [loadingJunta, setLoadingJunta] = useState(true);
  const [junta, setJunta] = useState<Junta | null>(juntas.find((j) => j.id === params.id) ?? null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [accessState, setAccessState] = useState<'checking' | 'allowed' | 'unauthorized' | 'blocked' | 'not_found' | 'can_join'>('checking');
  const [joiningFromPreview, setJoiningFromPreview] = useState(false);
  const [joinPreviewError, setJoinPreviewError] = useState<string | null>(null);
  const [phaseTwoLoading, setPhaseTwoLoading] = useState(true);
  const [detailMembers, setDetailMembers] = useState<import('@/types/domain').JuntaMember[]>([]);
  const [detailPayments, setDetailPayments] = useState<typeof payments>([]);
  const [detailSchedules, setDetailSchedules] = useState<typeof schedules>([]);
  const [detailPayouts, setDetailPayouts] = useState<typeof payouts>([]);
  const [paymentInfo, setPaymentInfo] = useState<string | null>(null);
  const [manualTurns, setManualTurns] = useState<Record<string, number>>({});
  const [activating, setActivating] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [isConfirmingReceipt, setIsConfirmingReceipt] = useState(false);
  const [isDeletingJunta, setIsDeletingJunta] = useState(false);
  const [scoresByProfileId, setScoresByProfileId] = useState<Record<string, number>>({});
  const [remindingProfileId, setRemindingProfileId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setLoadingJunta(false);
        setAccessState('unauthorized');
        return;
      }

      setLoadError(null);
      setAccessState('checking');

      try {
        const storedJunta = juntas.find((j) => j.id === params.id) ?? null;
        const hasFullData = storedJunta != null && storedJunta.turn_assignment_mode != null;
        const [detailResult, membersResult, membershipResult] = await Promise.all([
          hasFullData ? Promise.resolve({ ok: true as const, data: storedJunta! }) : fetchJuntaById(params.id),
          fetchJuntaActiveMembers(params.id),
          fetchMyActiveMembership({ juntaId: params.id, profileId: user.id })
        ]);

        let resolvedJunta = detailResult.ok ? detailResult.data : null;
        const activeMembers = membersResult.ok ? membersResult.data : [];

        if (!resolvedJunta) {
          // Fallback only when direct detail fetch fails; keep it as last attempt to avoid heavy catalog queries on happy path.
          const catalogResult = await fetchAvailableJuntas(user.id);
          if (catalogResult.ok) {
            resolvedJunta = catalogResult.data.find((item) => item.id === params.id) ?? null;
          }
        }

        if (!resolvedJunta) {
          setAccessState('not_found');
          return;
        }

        setJunta(resolvedJunta);

        const isCreator = resolvedJunta.admin_id === user.id;
        const isActiveMember = membershipResult.ok
          ? membershipResult.isActiveMember
          : activeMembers.some((member) => member.profile_id === user.id);
        const hasAccess = isCreator || isActiveMember;

        if (isJuntaBlockedByDeadline(resolvedJunta)) {
          setAccessState('blocked');
          return;
        }

        if (!hasAccess) {
          const codeParam = searchParams.get('code');
          if (resolvedJunta.visibilidad === 'privada' && codeParam) {
            setAccessState('can_join');
          } else {
            setAccessState('unauthorized');
          }
          return;
        }

        setDetailMembers(membersResult.ok ? membersResult.data : []);
        setAccessState('allowed');
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'No se pudo cargar la junta.');
      } finally {
        setLoadingJunta(false);
      }
    };
    load();
  }, [juntas, params.id, searchParams, setData, user, user?.id]);

  useEffect(() => {
    if (accessState !== 'allowed' || !junta) return;
    let cancelled = false;
    const loadPhaseTwo = async () => {
      setPhaseTwoLoading(true);

      // Always fetch payments, schedules, and payouts directly from DB to avoid stale
      // store state after re-login (store is cleared on logout and repopulated async).
      // Payouts are critical for currentWeek calculation — a stale store count causes
      // the UI to show the wrong round as "current", mismatching the backend.
      const [paymentsResult, schedulesResult, payoutsResult, rankingResult] = await Promise.all([
        fetchPaymentsByJuntaId(junta.id),
        fetchSchedulesByJuntaId(junta.id),
        fetchPayoutsByJuntaId(junta.id),
        fetchGlobalRanking(),
      ]);

      if (cancelled) return;

      const freshPayments = paymentsResult.ok ? paymentsResult.data : payments.filter((p) => p.junta_id === junta.id);
      const freshSchedules = schedulesResult.ok ? schedulesResult.data : schedules.filter((s) => s.junta_id === junta.id);
      const freshPayouts = payoutsResult.ok ? payoutsResult.data : payouts.filter((p) => p.junta_id === junta.id);

      if (process.env.NODE_ENV === 'development') {
        console.debug('[PHASE TWO LOAD DEBUG]', {
          juntaId: junta.id,
          currentUserId: user?.id,
          authUid: user?.id,
          completedPayoutsFromDB: freshPayouts.length,
          derivedCurrentWeek: freshPayouts.length + 1,
          schedules: freshSchedules,
          rawPayments: freshPayments,
          currentUserPayment: freshPayments.find((p) => p.profile_id === user?.id),
          resolvedStatus: freshPayments.find((p) => p.profile_id === user?.id)?.estado ?? 'none',
        });
      }

      // Merge fresh DB data into store so other pages (e.g. pagar) pick it up.
      setData({
        schedules: [...schedules.filter((s) => s.junta_id !== junta.id), ...freshSchedules],
        payments: [...payments.filter((p) => p.junta_id !== junta.id), ...freshPayments],
        payouts: [...payouts.filter((p) => p.junta_id !== junta.id), ...freshPayouts],
      });

      setDetailPayments(freshPayments);
      setDetailSchedules(freshSchedules);
      setDetailPayouts(freshPayouts);
      if (rankingResult.ok) {
        setScoresByProfileId(Object.fromEntries(rankingResult.data.map((entry) => [entry.profileId, entry.score])));
      }
      setPhaseTwoLoading(false);
    };
    loadPhaseTwo();
    return () => { cancelled = true; };
    // Deps: only junta.id and accessState. We fetch from DB directly so we don't
    // need to re-run when the store's payments/schedules change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessState, junta?.id]);

  // When the user returns from the payment page (?view=participante), do a full
  // snapshot refresh so the new payment is reflected with its real DB state.
  const refreshedAfterPayRef = useRef(false);
  useEffect(() => {
    if (accessState !== 'allowed' || !user?.id) return;
    if (searchParams.get('view') !== 'participante') return;
    if (refreshedAfterPayRef.current) return;
    refreshedAfterPayRef.current = true;
    refreshSnapshot().then(() => {
      if (process.env.NODE_ENV === 'development') {
        // Log post-payment sync state so we can verify the store reflects the
        // submitted payment before the user navigates to the dashboard.
        console.debug('[PAYMENT FLOW SYNC]', {
          afterPayment: true,
          profileId: user?.id,
          juntaId: params.id,
          paymentsInStore: payments.filter((p) => p.junta_id === params.id),
          schedulesInStore: schedules.filter((s) => s.junta_id === params.id),
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessState, user?.id, searchParams]);

  const juntaMembers = useMemo(() => {
    if (!junta) return detailMembers;
    return getActiveMembersForJunta(junta, detailMembers);
  }, [detailMembers, junta]);
  const currentUserName = useMemo(() => user?.nombre?.split(' ')[0] ?? 'Tú', [user?.nombre]);
  const juntaRacha = useMemo(() => {
    if (!user) return null;
    return computeJuntaRacha({ juntaId: params.id, userId: user.id, payments: detailPayments, schedules: detailSchedules });
  }, [params.id, user, detailPayments, detailSchedules]);

  const simulation = useMemo(() => {
    if (!junta) return null;
    return calcularSimulacionJunta({
      participantes: junta.participantes_max,
      cuotaBase: junta.cuota_base ?? junta.monto_cuota,
      fechaInicio: junta.fecha_inicio,
      frecuencia: junta.frecuencia_pago,
      tipoJunta: junta.tipo_junta ?? 'normal',
      incentivoPorcentaje: junta.incentivo_porcentaje ?? 0,
      incentivoPorTurno: junta.incentivo_turnos
    });
  }, [junta]);

  const refreshSnapshot = async () => {
    if (!user?.id) return;

    // Fetch directly from DB in parallel — more reliable and faster than the full user
    // snapshot, which aggregates all juntas and can mask timing issues right after an RPC.
    const [payoutsResult, paymentsResult, schedulesResult, membersResult, juntaResult] = await Promise.all([
      fetchPayoutsByJuntaId(params.id),
      fetchPaymentsByJuntaId(params.id),
      fetchSchedulesByJuntaId(params.id),
      fetchJuntaActiveMembers(params.id),
      fetchJuntaById(params.id),
    ]);

    if (process.env.NODE_ENV === 'development') {
      console.debug('[SNAPSHOT REFRESH DEBUG]', {
        juntaId: params.id,
        payoutsCount: payoutsResult.ok ? payoutsResult.data.length : 'error',
        paymentsCount: paymentsResult.ok ? paymentsResult.data.length : 'error',
        schedulesCount: schedulesResult.ok ? schedulesResult.data.length : 'error',
        membersOk: membersResult.ok,
        juntaEstado: juntaResult.ok ? juntaResult.data?.estado : 'error',
      });
    }

    if (payoutsResult.ok) {
      setDetailPayouts(payoutsResult.data);
      setData({ payouts: [...payouts.filter((p) => p.junta_id !== params.id), ...payoutsResult.data] });
    }
    if (paymentsResult.ok) {
      setDetailPayments(paymentsResult.data);
      setData({ payments: [...payments.filter((p) => p.junta_id !== params.id), ...paymentsResult.data] });
    }
    if (schedulesResult.ok) {
      setDetailSchedules(schedulesResult.data);
      setData({ schedules: [...schedules.filter((s) => s.junta_id !== params.id), ...schedulesResult.data] });
    }
    if (membersResult.ok) setDetailMembers(membersResult.data);
    if (juntaResult.ok && juntaResult.data) setJunta(juntaResult.data);
  };

  const handleJoinFromPreview = async () => {
    if (!user || !junta) return;
    const codeParam = searchParams.get('code');
    setJoiningFromPreview(true);
    setJoinPreviewError(null);
    const result = await joinJuntaAsParticipant({ juntaId: junta.id, profileId: user.id, accessCode: codeParam ?? undefined });
    if (!result.ok) {
      setJoinPreviewError(result.message);
      setJoiningFromPreview(false);
      return;
    }
    window.location.href = `/juntas/${junta.id}`;
  };

  if (loadingJunta) return <Card>Cargando junta...</Card>;
  if (loadError) return <Card><p className="text-sm text-red-600">No pudimos cargar la junta: {loadError}</p></Card>;
  if (accessState === 'unauthorized') return <Card><p className="text-sm text-slate-600">No tienes permisos para ver esta junta.</p></Card>;
  if (accessState === 'blocked') return <Card><p className="text-sm text-slate-600">Esta junta no está disponible temporalmente.</p></Card>;
  if (accessState === 'not_found') return <Card><p className="text-sm text-slate-600">Junta no encontrada.</p></Card>;

  if (accessState === 'can_join' && junta) {
    const memberCount = Number(junta.integrantes_actuales ?? 0);
    const isFull = memberCount >= junta.participantes_max;
    const isBlocked = isJuntaBlockedByDeadline(junta);
    return (
      <Card className="space-y-4 p-5">
        <div>
          <h1 className="text-2xl font-semibold">{junta.nombre}</h1>
          {junta.descripcion && <p className="mt-1 text-sm text-slate-500">{junta.descripcion}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{junta.visibilidad === 'privada' ? 'Privada' : 'Pública'}</Badge>
            <Badge>{junta.tipo_junta === 'incentivo' ? 'Con incentivos' : 'Normal'}</Badge>
            <Badge>{junta.frecuencia_pago}</Badge>
            <Badge>{memberCount}/{junta.participantes_max} integrantes</Badge>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-1">
          <p className="text-sm text-slate-600">Cuota: <span className="font-semibold">S/{(junta.cuota_base ?? junta.monto_cuota).toFixed(0)}</span></p>
          {junta.fecha_inicio && <p className="text-sm text-slate-600">Inicio: <span className="font-semibold">{formatCalendarDate(junta.fecha_inicio)}</span></p>}
        </div>
        {isFull && <p className="text-sm text-amber-700 rounded-md bg-amber-50 border border-amber-200 p-3">Esta junta ya está completa.</p>}
        {isBlocked && <p className="text-sm text-red-700 rounded-md bg-red-50 border border-red-200 p-3">Esta junta está bloqueada y no acepta nuevos integrantes.</p>}
        {!isFull && !isBlocked && (
          <Button onClick={handleJoinFromPreview} disabled={joiningFromPreview}>
            {joiningFromPreview ? 'Uniéndote…' : 'Unirte a esta junta'}
          </Button>
        )}
        {joinPreviewError && <p className="text-sm text-red-600">{joinPreviewError}</p>}
      </Card>
    );
  }

  if (!junta || !simulation) return <Card><p className="text-sm text-slate-600">Junta no encontrada.</p></Card>;

  const juntaActiva = isJuntaActive(junta.estado);
  const juntaFinalizada = junta.estado === 'cerrada';
  const blockedByDeadline = isJuntaBlockedByDeadline(junta);
  // Use detailPayouts (fetched fresh from DB in loadPhaseTwo) to compute the current round.
  // Using the store's `payouts` here caused stale-read bugs: if the store was empty or outdated,
  // the UI would show the wrong round as "current", mismatching the backend's COUNT(*)+1 derivation.
  const completedPayouts = detailPayouts.length;
  const currentWeek = Math.min(completedPayouts + 1, simulation.rows.length);
  const currentRoundSchedule = detailSchedules.find((s) => s.cuota_numero === currentWeek);
  const currentRoundDueDate = currentRoundSchedule?.fecha_vencimiento
    ? formatCalendarDate(currentRoundSchedule.fecha_vencimiento)
    : 'Sin fecha';
  const summary = getCurrentWeekSummary({
    junta,
    members: juntaMembers,
    payments: detailPayments,
    schedules: detailSchedules,
    currentWeek,
    userId: user?.id,
    juntaActiva: juntaActiva || juntaFinalizada,
    scoresByProfileId
  });
  const paidParticipants = getPaidParticipants(summary.rows);
  const validatingParticipants = getValidatingParticipants(summary.rows);
  const pendingPayers = getPendingPayers(summary.rows);
  const needsScheduleRows = (mainView === 'general' && (generalTab === 'cronograma' || generalTab === 'turnos')) || mainView === 'personal';
  const scheduleRows = needsScheduleRows
    ? getTurnSchedule({
      rows: simulation.rows.map((row) => ({ ...row })),
      currentWeek,
      receiverTurn: juntaMembers.find((member) => member.profile_id === user?.id)?.orden_turno ?? null
    }).map((row) => juntaFinalizada ? { ...row, weekStatus: 'Entregado' as const, isCurrentWeek: false } : row)
    : [];
  const personal = getUserPersonalJuntaView({
    junta,
    currentWeek,
    weeklyRows: summary.rows,
    myTurn: juntaMembers.find((member) => member.profile_id === user?.id)?.orden_turno ?? null,
    simulationRows: simulation.rows.map((row) => ({ ...row }))
  });

  const incentiveLabel = formatIncentiveLabel({
    tipoJunta: junta.tipo_junta,
    incentivoPorcentaje: junta.incentivo_porcentaje,
    incentivoRegla: junta.incentivo_regla
  });

  const displayPaid = summary.paid;
  const displayPending = summary.pending;

  const handleDeleteJunta = async () => {
    if (!isOwner || !junta || isDeletingJunta) return;
    const confirmed = window.confirm('¿Seguro que deseas eliminar esta junta? Esta acción no se puede deshacer.');
    if (!confirmed) return;
    setIsDeletingJunta(true);
    const result = await deleteDraftJunta({ juntaId: junta.id, currentProfileId: user!.id });
    if (!result.ok) {
      setPaymentInfo((result as { ok: false; message: string }).message ?? 'No se pudo eliminar la junta.');
      setIsDeletingJunta(false);
      return;
    }
    router.push('/juntas');
  };

  const handleCopyLink = async () => {
    const origin = window.location.origin;
    const url =
      junta.visibilidad === 'publica'
        ? `${origin}/junta/${junta.slug}`
        : `${origin}/juntas?code=${junta.access_code ?? ''}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('error');
    }
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  const handleWhatsAppInvite = () => {
    const origin = window.location.origin;
    const url = junta.visibilidad === 'publica'
      ? `${origin}/junta/${junta.slug}`
      : `${origin}/juntas?code=${junta.access_code ?? ''}`;
    const message = encodeURIComponent(`Te invito a unirte a ${junta.nombre} en Juntealo: ${url}`);
    window.open(`https://wa.me/?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  const isOwner = user?.id === junta.admin_id;
  const memberCount = junta.integrantes_actuales ?? juntaMembers.length;
  const missingMembers = Math.max(junta.participantes_max - memberCount, 0);
  const isIncomplete = missingMembers > 0 && !juntaFinalizada;
  const canManualAssign = isOwner && !juntaActiva && !juntaFinalizada && !blockedByDeadline;
  const canShuffle = isOwner && !juntaActiva && !juntaFinalizada && !blockedByDeadline && memberCount >= junta.participantes_max;
  const allTurnsAssigned = juntaMembers.length > 0 && (() => {
    const turns = juntaMembers.map((m) => manualTurns[m.profile_id] ?? m.orden_turno ?? 0);
    const assigned = turns.filter((t) => t > 0);
    return assigned.length === juntaMembers.length && new Set(assigned).size === juntaMembers.length;
  })();
  const currentUserProfileId = user?.id ?? null;
  const currentReceiverProfileId = summary.receiver?.profile_id ?? null;
  const isCurrentReceiver = currentUserProfileId !== null && currentUserProfileId === currentReceiverProfileId;

  const requiredPayers = summary.rows.filter((r) => !r.isReceiver);
  const allPaymentsApproved = requiredPayers.length > 0 && requiredPayers.every((r) => r.status === 'Pagado');
  const canConfirmReceipt = isCurrentReceiver && allPaymentsApproved && !juntaFinalizada;
  const paymentTargetCount = requiredPayers.length;

  if (process.env.NODE_ENV === 'development') {
    console.debug('[CONFIRM RECEIPT DEBUG]', {
      juntaId: params.id,
      currentUserId: user?.id,
      currentUserProfileId,
      currentReceiverProfileId,
      receiverName: summary.receiver?.displayName,
      isCurrentReceiver,
      requiredPayers: requiredPayers.map((r) => ({ profileId: r.profileId, status: r.status })),
      allPaymentsApproved,
      canConfirmReceipt,
    });
  }

  const openWhatsAppReminder = (row: WeeklyMemberRow) => {
    const rawPhone = row.celular ?? '';
    const digits = rawPhone.replace(/\D/g, '');
    const phone = digits.length === 9 ? `51${digits}` : digits;
    if (!phone) {
      alert('Este integrante no tiene celular registrado.');
      return;
    }
    const message = encodeURIComponent(
      `Hola ${row.displayName}, te recordamos que tienes pendiente tu aporte de S/ ${row.amount.toFixed(0)} para la junta ${junta!.nombre}. Por favor regularízalo para continuar con el ciclo.`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const handleSendPaymentReminder = async (row: WeeklyMemberRow) => {
    if (remindingProfileId) return;
    setRemindingProfileId(row.profileId);
    setPaymentInfo(null);
    const result = await sendPaymentReminder({ juntaId: junta!.id, profileId: row.profileId });
    setPaymentInfo(result.ok ? `Recordatorio enviado a ${row.displayName}.` : result.message);
    setRemindingProfileId(null);
  };

  const handleConfirmPayout = async () => {
    if (!isCurrentReceiver || !junta || isConfirmingReceipt) return;

    const amount = (junta.cuota_base ?? junta.monto_cuota) * juntaMembers.length;

    if (process.env.NODE_ENV === 'development') {
      const totalRounds = juntaMembers.length;
      console.debug('[CONFIRM RECEIPT FLOW]', {
        currentUser: user?.id,
        currentReceiver: currentReceiverProfileId,
        currentRound: currentWeek,
        payoutsLength: detailPayouts.length,
      });
      console.debug('[FINAL ROUND CHECK]', {
        currentRound: currentWeek,
        totalRounds,
        isLastRound: currentWeek === totalRounds,
        juntaEstado: junta.estado,
      });
    }

    setIsConfirmingReceipt(true);
    setPaymentInfo(null);

    // Optimistic update: add the new payout immediately so currentWeek advances
    // and the confirm button disappears without waiting for the network.
    const optimisticPayout = {
      id: `optimistic-${Date.now()}`,
      junta_id: junta.id,
      ronda_numero: currentWeek,
      profile_id: user!.id,
      monto_pozo: amount,
      entregado_en: new Date().toISOString(),
    };
    setDetailPayouts((prev) => [...prev, optimisticPayout]);

    try {
      const result = await confirmPayout({
        juntaId: junta.id,
        profileId: user!.id,
        roundNumber: currentWeek,
        amount,
      });

      if (!result.ok) {
        setDetailPayouts((prev) => prev.filter((p) => p.id !== optimisticPayout.id));
        setPaymentInfo(result.message);
        return;
      }

      // RPC succeeded — refresh from DB to replace optimistic entry with real data
      await refreshSnapshot();
    } catch {
      setDetailPayouts((prev) => prev.filter((p) => p.id !== optimisticPayout.id));
      setPaymentInfo('Error al confirmar. Intenta de nuevo.');
    } finally {
      setIsConfirmingReceipt(false);
    }
  };

  const handleAcceptPayment = async (paymentId: string, currentStatus: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[PAYMENT ACTION CLICK]', { paymentId, status: currentStatus, action: 'approve' });
    }
    const result = await updatePaymentStatus({ paymentId, estado: 'approved' });
    if (!result.ok) {
      setPaymentInfo(result.message);
    } else {
      setPaymentInfo(null);
    }
    // Siempre refrescar para sincronizar UI con BD real
    await refreshSnapshot();
  };

  const handleRejectPayment = async (paymentId: string, currentStatus: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[PAYMENT ACTION CLICK]', { paymentId, status: currentStatus, action: 'reject' });
    }
    const result = await updatePaymentStatus({ paymentId, estado: 'rejected' });
    if (!result.ok) {
      setPaymentInfo(result.message);
    } else {
      setPaymentInfo(null);
    }
    // Siempre refrescar para sincronizar UI con BD real
    await refreshSnapshot();
  };

  return (
    <div className="space-y-3 pb-6">
      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <JuntaAvatar nombre={junta.nombre} size="lg" />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{junta.nombre}</h1>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{junta.visibilidad === 'privada' ? 'Privada' : 'Pública'}</span>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">Semana {currentWeek} de {simulation.rows.length}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium capitalize text-slate-600">{junta.frecuencia_pago}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{junta.tipo_junta === 'incentivo' ? 'Con incentivos' : 'Normal'}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${juntaFinalizada ? 'bg-slate-100 text-slate-600' : juntaActiva ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{juntaFinalizada ? 'Finalizada' : juntaActiva ? 'Activa' : 'En formación'}</span>
                {blockedByDeadline && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">Bloqueada</span>}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={handleCopyLink} className="gap-1.5">
              <Copy size={14} />
              {copyStatus === 'copied' ? 'Enlace copiado' : copyStatus === 'error' ? 'Error al copiar' : 'Copiar enlace'}
            </Button>
            {isOwner && juntaFinalizada && (
              <Button size="sm" variant="outline" onClick={handleDeleteJunta} disabled={isDeletingJunta}>
                {isDeletingJunta ? 'Eliminando…' : 'Eliminar'}
              </Button>
            )}
          </div>
        </div>

        {isIncomplete && (
          <div className="flex flex-col gap-3 border-t border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white"><Sparkles size={15} /></span>
              <div><p className="text-sm font-semibold text-slate-900">Invita a más personas</p><p className="text-xs text-slate-600">Faltan {missingMembers} integrante{missingMembers === 1 ? '' : 's'} para comenzar.</p></div>
            </div>
            <Button size="sm" onClick={handleWhatsAppInvite} className="w-full sm:w-auto">Invitar por WhatsApp</Button>
          </div>
        )}
      </Card>

      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="inline-flex min-w-max gap-1 rounded-full border border-slate-200 bg-white p-1 text-xs" role="tablist" aria-label="Secciones de la junta">
          {([
            ['integrantes', 'Vista general'],
            ['cronograma', 'Cronograma'],
            ['pagos', 'Pagos'],
            ['turnos', 'Asignar turnos']
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mainView === 'general' && generalTab === id}
              onClick={() => {
                setMainView('general');
                setGeneralTab(id);
              }}
              className={`rounded-full px-3 py-1.5 transition-colors ${mainView === 'general' && generalTab === id ? 'bg-blue-100 font-semibold text-blue-700' : 'font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            role="tab"
            aria-selected={mainView === 'personal'}
            onClick={() => setMainView('personal')}
            className={`rounded-full px-3 py-1.5 transition-colors ${mainView === 'personal' ? 'bg-blue-100 font-semibold text-blue-700' : 'font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            Mi vista ({currentUserName})
          </button>
        </div>
      </div>

      {juntaFinalizada && (
        <Card className="border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-800">Esta junta ha finalizado</p>
          <p className="mt-1 text-xs text-emerald-700">Todos los turnos fueron completados. El historial queda disponible en modo solo lectura.</p>
        </Card>
      )}

      {mainView === 'general' && (
        <div className="space-y-4">
          {phaseTwoLoading && <Card className="p-3 text-sm text-slate-500">Cargando pagos, cronograma e integrantes…</Card>}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <KpiCard icon={Landmark} label="Bolsa semana" value={`S/${((junta.cuota_base ?? junta.monto_cuota) * juntaMembers.length).toFixed(0)}`} />
            <KpiCard icon={CheckCircle2} label="Pagos confirmados" value={phaseTwoLoading ? '—' : `${displayPaid}/${paymentTargetCount}`} tone="green" />
            <KpiCard icon={WalletCards} label="Turno actual" value={`#${currentWeek}`} tone="violet" />
            <KpiCard icon={Clock3} label="Pendientes" value={phaseTwoLoading ? '—' : `${displayPending}`} tone="amber" />
            <div className="col-span-2 sm:col-span-1"><KpiCard icon={CalendarClock} label="Fecha límite de pago" value={currentRoundDueDate} /></div>
          </div>

          {generalTab === 'integrantes' && (
            <div className="space-y-3">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
                <div className="space-y-3">
                  <Card className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div><h2 className="font-semibold text-slate-900">Progreso del grupo</h2><p className="mt-0.5 text-sm text-slate-500">{memberCount} de {junta.participantes_max} integrantes</p></div>
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{Math.round((memberCount / Math.max(junta.participantes_max, 1)) * 100)}%</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${Math.min((memberCount / Math.max(junta.participantes_max, 1)) * 100, 100)}%` }} /></div>
                    <p className="mt-2 text-xs text-slate-600">{isIncomplete ? `Faltan ${missingMembers} persona${missingMembers === 1 ? '' : 's'} para comenzar la junta.` : juntaFinalizada ? 'La junta completó todos sus turnos.' : 'El grupo está completo.'}</p>
                    {isIncomplete && <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" onClick={handleWhatsAppInvite}>Invitar por WhatsApp</Button><Button size="sm" variant="outline" onClick={handleCopyLink}><Share2 size={13} /> Compartir enlace</Button></div>}
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-slate-900">Integrantes <span className="font-normal text-slate-400">({memberCount}/{junta.participantes_max})</span></h2><button type="button" onClick={() => setGeneralTab('cronograma')} className="text-xs font-semibold text-blue-600 hover:text-blue-700">Ver todos</button></div>
                    <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                      {juntaMembers.map((member, index) => {
                        const name = member.profile_id === user?.id ? 'Tú' : member.nombre ?? `Integrante ${index + 1}`;
                        return <div key={member.id} className="w-14 shrink-0 text-center"><div className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold ${getAvatarColor(name)}`}>{getInitial(name)}</div><p className="mt-1 truncate text-[11px] font-medium text-slate-600">{name}</p></div>;
                      })}
                      {Array.from({ length: missingMembers }).map((_, index) => <button key={`empty-${index}`} type="button" onClick={handleWhatsAppInvite} className="w-14 shrink-0 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-blue-300 bg-blue-50 text-blue-600"><Plus size={16} /></span><span className="mt-1 block text-[11px] font-medium text-blue-600">Invitar</span></button>)}
                    </div>
                  </Card>
                </div>

                <div className="space-y-3">
                  <Card className="border-blue-200 bg-gradient-to-br from-blue-600 to-indigo-700 p-4 text-white">
                    <p className="text-xs font-medium text-blue-100">Tu próximo cobro</p>
                    <div className="mt-3 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-sm font-bold">{getInitial(currentUserName)}</div><div><p className="font-semibold">Tú</p><p className="text-xs text-blue-100">Turno #{personal.myTurnRow?.turno ?? '—'}</p></div></div>
                    <p className="mt-3 text-sm font-medium">{personal.myTurnRow?.turno === currentWeek ? 'Te toca recibir esta semana' : personal.myTurnRow ? `Recibes en la semana ${personal.myTurnRow.turno}` : 'Turno pendiente de asignación'}</p>
                    <div className="mt-2 flex items-end justify-between gap-2"><p className="text-2xl font-bold">S/{(personal.myTurnRow?.montoRecibido ?? simulation.bolsaBase).toFixed(0)}</p><JuntaScoreBadge score={personal.myRow?.score ?? null} /></div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center justify-between gap-2"><h2 className="font-semibold text-slate-900">Estado de pagos</h2><span className="text-xs text-slate-500">Semana {currentWeek}</span></div>
                    {phaseTwoLoading ? <p className="mt-3 text-sm text-slate-500">Cargando estado de pagos…</p> : <>
                      <div className="mt-3 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${(displayPaid / Math.max(paymentTargetCount, 1)) * 100}%` }} /></div><span className="text-sm font-bold text-slate-900">{displayPaid}/{paymentTargetCount}</span></div>
                      <p className="mt-2 text-xs font-medium text-slate-700">{displayPaid} confirmado{displayPaid === 1 ? '' : 's'} · {summary.validating} por validar · {displayPending} pendiente{displayPending === 1 ? '' : 's'}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">{isCurrentReceiver ? 'Como receptor de esta semana, puedes confirmar los pagos enviados.' : `Esta semana ${summary.receiver?.displayName ?? 'el receptor'} confirma los pagos enviados.`}</p>
                    </>}
                  </Card>
                </div>
              </div>

              <Card className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold text-slate-900">Gestión de pagos <span className="font-normal text-slate-400">· Semana {currentWeek}</span></h2><p className="text-xs text-slate-500">Esta semana recibe {summary.receiver?.displayName ?? '—'}.</p></div><Badge>{canConfirmReceipt ? 'Listo para confirmar' : 'En curso'}</Badge></div>
                <div className="grid gap-3 lg:grid-cols-3">
                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                    <p className="text-sm font-semibold">Confirmados ({paidParticipants.length}/{paymentTargetCount})</p>
                  {paidParticipants.map((row) => (
                    <JuntaPaymentStatusRow key={row.id} row={row} />
                  ))}
                  {paidParticipants.length === 0 && <p className="py-3 text-center text-xs text-slate-500">Aún no hay pagos confirmados.</p>}
                  </div>
                  <div className="space-y-2 rounded-xl border border-blue-200 bg-blue-50/40 p-3">
                    <p className="text-sm font-semibold">Por validar ({validatingParticipants.length}/{paymentTargetCount})</p>
                  {validatingParticipants.map((row) => (
                    <div key={row.id} className="space-y-1">
                      <JuntaPaymentStatusRow row={row} />
                      {isCurrentReceiver && row.paymentId && (
                        <div className="flex flex-wrap gap-2 pl-0 sm:pl-2">
                          <Button size="sm" onClick={() => handleAcceptPayment(row.paymentId!, row.status)}>Confirmar pago</Button>
                          <Button size="sm" variant="outline" onClick={() => handleRejectPayment(row.paymentId!, row.status)}>Rechazar</Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {validatingParticipants.length === 0 && <p className="py-3 text-center text-xs text-slate-500">No hay pagos por validar.</p>}
                  {paymentInfo && <p className="text-xs text-rose-700">{paymentInfo}</p>}
                  </div>
                  <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/40 p-3">
                    <p className="text-sm font-semibold">Pendientes ({pendingPayers.length}/{paymentTargetCount})</p>
                  {pendingPayers.map((row) => (
                    <div key={row.id} className="space-y-2">
                      <JuntaPaymentStatusRow row={row} />
                      {!juntaFinalizada && (
                        <div className="flex flex-wrap gap-2 pl-0 sm:pl-2">
                          {(isOwner || isCurrentReceiver) && <Button size="sm" variant="ghost" disabled={remindingProfileId !== null} onClick={() => handleSendPaymentReminder(row)}>{remindingProfileId === row.profileId ? 'Enviando…' : 'Reenviar recordatorio'}</Button>}
                          <Button size="sm" variant="outline" onClick={() => openWhatsAppReminder(row)}>WhatsApp</Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {pendingPayers.length === 0 && <p className="py-3 text-center text-xs text-emerald-600">No hay pagos pendientes.</p>}
                  </div>
                </div>
                {canConfirmReceipt && <div className="flex justify-end border-t pt-3"><Button size="sm" onClick={handleConfirmPayout} disabled={isConfirmingReceipt}>{isConfirmingReceipt ? 'Confirmando…' : 'Confirmar recibo'}</Button></div>}
              </Card>
            </div>
          )}

          {generalTab === 'cronograma' && (
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-2 text-left">Turno</th><th className="px-3 py-2 text-left">Participante</th><th className="px-3 py-2 text-left">Fecha</th><th className="px-3 py-2 text-left">Recibe</th><th className="px-3 py-2 text-left">Estado</th></tr></thead>
                <tbody>
                  {scheduleRows.map((row) => (
                    <tr key={row.turno} className={`border-t ${row.isCurrentWeek ? 'bg-blue-50' : ''}`}>
                      <td className="px-3 py-2">#{row.turno}</td>
                      <td className="px-3 py-2">{row.isUserTurn ? 'Tú' : (juntaMembers.find((m) => m.orden_turno === row.turno)?.nombre ?? `Integrante ${row.turno}`)}</td>
                      <td className="px-3 py-2">{row.fechaRonda}</td>
                      <td className="px-3 py-2">S/{row.montoRecibido.toFixed(2)}</td>
                      <td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-xs ${statusClass(row.weekStatus)}`}>{row.weekStatus}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="p-3 text-xs text-slate-500">{junta.tipo_junta === 'incentivo' ? `Incentivos aplicados: ${incentiveLabel}` : 'Junta normal sin incentivos.'}</p>
            </Card>
          )}

          {generalTab === 'pagos' && (
            <Card className="space-y-3 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-semibold">Semana {currentWeek} — {summary.receiver?.displayName ?? 'Receptor'} recibe</h3>
                <Badge>{juntaFinalizada ? 'Completada' : 'En curso'}</Badge>
              </div>
              <div className="space-y-2">
                {summary.rows.map((row) => (
                  <JuntaPaymentStatusRow key={row.id} row={row} showPayAction={!juntaFinalizada} onPay={() => router.push(`/juntas/${junta.id}/registrar-pago`)} />
                ))}
              </div>
            </Card>
          )}

          {generalTab === 'turnos' && (
            <Card className="space-y-3 p-4">
              {juntaActiva || juntaFinalizada || blockedByDeadline ? (
                <p className="rounded-md bg-slate-100 p-3 text-sm text-slate-600">
                  {juntaFinalizada
                    ? 'La junta ha finalizado. Los turnos están en modo solo lectura.'
                    : blockedByDeadline
                    ? 'La junta está bloqueada por vencimiento y los turnos quedan en modo solo lectura.'
                    : 'La junta ya está activa. Los turnos están en modo solo lectura.'}
                </p>
              ) : (
                <>
                  {memberCount < junta.participantes_max && (
                    <p className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                      Faltan {junta.participantes_max - memberCount} integrante(s) para completar la junta. Los turnos se podrán asignar cuando el grupo esté completo.
                    </p>
                  )}
                  <div className="space-y-2">
                    {juntaMembers.map((member, index) => {
                      const displayName = member.profile_id === user?.id
                        ? `Tú${member.nombre ? ` (${member.nombre.split(' ')[0]})` : ''}`
                        : member.nombre ?? (member.profile_id === junta.admin_id ? 'Creador' : `Integrante ${index + 1}`);
                      return (
                        <div key={member.id} className="flex flex-col gap-2 rounded-md border p-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="break-words text-sm">{displayName}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Turno</span>
                            <select
                              className="rounded-md border px-2 py-1 text-sm"
                              value={manualTurns[member.profile_id] ?? member.orden_turno ?? ''}
                              onChange={(event) => setManualTurns((prev) => ({ ...prev, [member.profile_id]: Number(event.target.value) }))}
                              disabled={!canManualAssign}
                            >
                              <option value="">—</option>
                              {Array.from({ length: juntaMembers.length }).map((_, turnIdx) => <option key={turnIdx + 1} value={turnIdx + 1}>{turnIdx + 1}</option>)}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={!canShuffle || activating}
                      onClick={async () => {
                        setActivating(true);
                        setPaymentInfo(null);
                        try {
                          const shuffled = [...juntaMembers].sort(() => Math.random() - 0.5);
                          const turnsByProfileId: Record<string, number> = {};
                          shuffled.forEach((member, idx) => { turnsByProfileId[member.profile_id] = idx + 1; });
                          setManualTurns(turnsByProfileId);

                          if (junta.turn_assignment_mode !== 'manual') {
                            const modeResult = await setJuntaAssignmentMode({ juntaId: junta.id, mode: 'manual' });
                            if (!modeResult.ok) { setPaymentInfo(modeResult.message); return; }
                          }

                          const saveTurnsResult = await updateJuntaMemberTurns({ juntaId: junta.id, turnsByProfileId });
                          if (!saveTurnsResult.ok) { setPaymentInfo(saveTurnsResult.message); return; }

                          const result = await activateJuntaIfReady({ juntaId: junta.id });
                          if (!result.ok) { setPaymentInfo(result.message); return; }

                          const freshResult = await fetchJuntaById(params.id);
                          if (freshResult.ok && freshResult.data) setJunta(freshResult.data);
                          await refreshSnapshot();
                        } catch {
                          setPaymentInfo('Ocurrió un error al sortear. Intenta de nuevo.');
                        } finally {
                          setActivating(false);
                        }
                      }}
                    >
                      {activating ? 'Sorteando…' : 'Sortear y activar'}
                    </Button>
                    <Button
                      disabled={!isOwner || memberCount < junta.participantes_max || !allTurnsAssigned || activating}
                      onClick={async () => {
                        setActivating(true);
                        setPaymentInfo(null);
                        try {
                          const assignedTurns = juntaMembers.map((member) => manualTurns[member.profile_id] ?? member.orden_turno ?? 0);
                          const uniqueTurns = new Set(assignedTurns.filter((t) => t > 0));
                          if (uniqueTurns.size !== juntaMembers.length) {
                            setPaymentInfo('No puedes repetir turnos. Asigna un turno único por integrante.');
                            return;
                          }

                          if (junta.turn_assignment_mode !== 'manual') {
                            const modeResult = await setJuntaAssignmentMode({ juntaId: junta.id, mode: 'manual' });
                            if (!modeResult.ok) { setPaymentInfo(modeResult.message); return; }
                          }

                          const turnsByProfileId = juntaMembers.reduce<Record<string, number>>((acc, member) => {
                            acc[member.profile_id] = manualTurns[member.profile_id] ?? member.orden_turno ?? 0;
                            return acc;
                          }, {});

                          const saveTurnsResult = await updateJuntaMemberTurns({ juntaId: junta.id, turnsByProfileId });
                          if (!saveTurnsResult.ok) { setPaymentInfo(saveTurnsResult.message); return; }

                          const result = await activateJuntaIfReady({ juntaId: junta.id });
                          if (!result.ok) { setPaymentInfo(result.message); return; }

                          const freshResult = await fetchJuntaById(params.id);
                          if (freshResult.ok && freshResult.data) setJunta(freshResult.data);
                          await refreshSnapshot();
                        } catch {
                          setPaymentInfo('Ocurrió un error al activar la junta. Intenta de nuevo.');
                        } finally {
                          setActivating(false);
                        }
                      }}
                    >
                      {activating ? 'Activando…' : 'Activar junta'}
                    </Button>
                  </div>
                  {!allTurnsAssigned && memberCount >= junta.participantes_max && (
                    <p className="text-xs text-slate-500">Asigna un turno único a cada integrante para poder activar la junta.</p>
                  )}
                </>
              )}
              {paymentInfo && <p className="text-xs text-rose-700">{paymentInfo}</p>}
              {blockedByDeadline && (
                <p className="text-xs text-rose-700">Bloqueada por no activarse antes de la fecha del primer pago ({APP_BUSINESS_TIMEZONE}).</p>
              )}
            </Card>
          )}
        </div>
      )}

      {mainView === 'personal' && (
        <div className="space-y-4">
          <Card className="space-y-3 border-0 bg-slate-900 p-5 text-white">
            <p className="text-xs uppercase tracking-wide text-slate-300">Tu turno</p>
            <p className="text-5xl font-bold">#{personal.myTurnRow?.turno ?? '-'}</p>
            <p className="text-sm text-slate-200">{junta.nombre} · Recibes S/{(personal.myTurnRow?.montoRecibido ?? simulation.bolsaBase).toFixed(2)}</p>
            <p className="text-sm text-slate-300">Fecha estimada: {personal.myTurnRow?.fechaRonda ?? 'Pendiente'} · {personal.myTurnRow ? `en ${Math.max(personal.myTurnRow.turno - currentWeek, 0)} semanas` : 'sin turno asignado'}</p>
            <div className="flex flex-wrap items-center gap-2"><JuntaScoreBadge score={personal.myRow?.score ?? null} /><span className="text-xs text-slate-300">Confianza visible para el grupo</span></div>
          </Card>

          {juntaRacha && (
            <RachaCard
              semanasActual={juntaRacha.semanasActual}
              recordPersonal={juntaRacha.recordPersonal}
              proximoHito={juntaRacha.proximoHito}
              estado={juntaRacha.estado}
              horasRestantes={juntaRacha.horasRestantes}
            />
          )}

          {!juntaFinalizada && personal.myRow && personal.myRow.status !== 'Pagado' && personal.myRow.status !== 'Recibe' && (
            <Card className="border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Esta semana debes pagar S/{personal.myRow.amount.toFixed(2)}{junta.tipo_junta === 'incentivo' ? ' (incluye ajustes por incentivos).' : '.'}
            </Card>
          )}

          {isCurrentReceiver && !juntaFinalizada ? (
            <Card className="space-y-3 p-4">
              <h3 className="text-lg font-semibold">Esta semana · recibes el pozo</h3>
              <p className="text-4xl font-bold text-emerald-600">S/{(personal.myTurnRow?.montoRecibido ?? (junta.cuota_base ?? junta.monto_cuota) * juntaMembers.length).toFixed(2)}</p>
              <div className="text-sm text-slate-600">
                <p>{summary.paid}/{juntaMembers.length - 1} pagos recibidos</p>
              </div>
              {canConfirmReceipt ? (
                <Button onClick={handleConfirmPayout} disabled={isConfirmingReceipt}>
                  {isConfirmingReceipt ? 'Confirmando…' : 'Confirmar recibo →'}
                </Button>
              ) : (
                <p className="text-sm text-slate-500">
                  {requiredPayers.some((r) => r.status === 'Validando')
                    ? `Hay ${requiredPayers.filter((r) => r.status === 'Validando').length} pago(s) pendientes de aprobación.`
                    : `Esperando ${summary.pending} pago(s) para liberar la bolsa.`}
                </p>
              )}
              {paymentInfo && <p className="text-xs text-amber-700">{paymentInfo}</p>}
            </Card>
          ) : (
            <Card className="space-y-3 p-4">
              <h3 className="text-lg font-semibold">Esta semana · turno de {summary.receiver?.displayName ?? '—'}</h3>
              <p className="text-4xl font-bold">S/{(personal.myRow?.amount ?? (junta.cuota_base ?? junta.monto_cuota)).toFixed(2)}</p>
              <div className="text-sm text-slate-600">
                <p>Base: S/{(junta.cuota_base ?? junta.monto_cuota).toFixed(2)}</p>
                <p>Ajuste: {junta.tipo_junta === 'incentivo' ? incentiveLabel : 'No aplica'}</p>
                <p>{personal.progressLabel}</p>
              </div>
              {!juntaFinalizada && personal.myRow?.status !== 'Pagado' && personal.myRow?.status !== 'Validando' && (
                <Button onClick={() => router.push(`/juntas/${junta.id}/registrar-pago`)}>Pagar ahora →</Button>
              )}
              {personal.myRow?.status === 'Pagado' && <p className="text-sm font-medium text-emerald-600">Ya enviaste tu pago.</p>}
              {personal.myRow?.status === 'Validando' && <p className="text-sm font-medium text-blue-600">Tu pago está en validación.</p>}
              {paymentInfo && <p className="text-xs text-amber-700">{paymentInfo}</p>}
            </Card>
          )}

          <Card className="space-y-2 p-4">
            <h4 className="text-sm font-semibold">Estado del grupo esta semana</h4>
            {summary.rows.slice(0, 4).map((row) => <JuntaPaymentStatusRow key={row.id} row={row} />)}
            <p className="text-xs text-slate-500">{summary.paid} pagaron de {summary.rows.length}</p>
          </Card>

          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-2 text-left">Semana</th><th className="px-3 py-2 text-left">Fecha</th><th className="px-3 py-2 text-left">Recibe</th><th className="px-3 py-2 text-left">Tu aporte</th><th className="px-3 py-2 text-left">Estado</th></tr></thead>
              <tbody>
                {scheduleRows.map((row) => {
                  const isCurrent = row.turno === currentWeek;
                  const isMine = row.isUserTurn;
                  const status = juntaFinalizada ? 'Pagado' : row.turno < currentWeek ? 'Pagado' : isCurrent ? 'Pagar' : isMine ? 'Tu turno' : 'Por venir';
                  return (
                    <tr key={row.turno} className="border-t">
                      <td className="px-3 py-2">Semana {row.turno}</td>
                      <td className="px-3 py-2">{row.fechaRonda}</td>
                      <td className="px-3 py-2">{isMine ? 'Tú' : (juntaMembers.find((m) => m.orden_turno === row.turno)?.nombre ?? `Integrante ${row.turno}`)}</td>
                      <td className="px-3 py-2">S/{row.cuotaPorRonda.toFixed(2)}</td>
                      <td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-xs ${statusClass(status)}`}>{status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}
