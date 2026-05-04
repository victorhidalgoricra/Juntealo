import { Junta, JuntaMember, Payment, PaymentSchedule } from '@/types/domain';
import { normalizePaymentStatus } from '@/lib/payment-status';

export type WeeklyPaymentStatus = 'Pagado' | 'Pendiente' | 'Validando' | 'Vencido' | 'Rechazado' | 'En formación' | 'Recibe';

export type SimulatedRound = {
  turno: number;
  fechaRonda: string;
  montoRecibido: number;
  cuotaPorRonda: number;
};

export type WeeklyMemberRow = {
  id: string;
  profileId: string;
  displayName: string;
  celular?: string;
  turno: number;
  score: number;
  status: WeeklyPaymentStatus;
  amount: number;
  isReceiver: boolean;
  isCurrentUser: boolean;
  paymentId?: string;
};

function resolvePaymentStatus(params: {
  juntaActiva: boolean;
  schedule?: PaymentSchedule;
  payment?: Payment;
  isReceiver?: boolean;
}): WeeklyPaymentStatus {
  if (!params.juntaActiva) return 'En formación';
  if (params.isReceiver) return 'Recibe';
  if (params.schedule?.estado === 'vencida' && !params.payment) return 'Vencido';
  // Check both `estado` and `payment_status` — the DB stores Spanish values in `estado`
  // while the local store may use the TypeScript enum in either field.
  const normalizedEstado = normalizePaymentStatus(params.payment?.estado);
  const normalizedStatus = normalizePaymentStatus(params.payment?.payment_status);
  const normalized = normalizedEstado !== 'pending' ? normalizedEstado : normalizedStatus;
  if (normalized === 'approved') return 'Pagado';
  if (normalized === 'submitted' || normalized === 'validating') return 'Validando';
  if (normalized === 'rejected') return 'Rechazado';
  if (normalized === 'overdue') return 'Vencido';
  return 'Pendiente';
}

export function getCurrentReceiver(params: {
  currentWeek: number;
  members: JuntaMember[];
  userId?: string;
  adminId: string;
}) {
  const receiver = params.members.find((member) => member.orden_turno === params.currentWeek) ?? null;
  if (!receiver) return null;
  const memberIndex = params.members.findIndex((member) => member.profile_id === receiver.profile_id);
  const displayName =
    receiver.profile_id === params.userId
      ? 'Tú'
      : receiver.nombre ?? (receiver.profile_id === params.adminId ? 'Creador' : `Integrante ${Math.max(memberIndex + 1, 1)}`);
  return { ...receiver, displayName };
}

export function getCurrentWeekSummary(params: {
  junta: Junta;
  members: JuntaMember[];
  payments: Payment[];
  schedules: PaymentSchedule[];
  currentWeek: number;
  userId?: string;
  juntaActiva: boolean;
}) {
  const currentSchedule = params.schedules
    .filter((schedule) => schedule.junta_id === params.junta.id && schedule.cuota_numero === params.currentWeek)
    .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))[0];
  const receiver = getCurrentReceiver({
    currentWeek: params.currentWeek,
    members: params.members,
    userId: params.userId,
    adminId: params.junta.admin_id
  });
  const rows = getCurrentWeekPaymentRows({
    junta: params.junta,
    members: params.members,
    payments: params.payments,
    currentWeek: params.currentWeek,
    currentSchedule,
    receiverProfileId: receiver?.profile_id,
    userId: params.userId,
    juntaActiva: params.juntaActiva
  });
  const paid = rows.filter((row) => row.status === 'Pagado' || row.status === 'Validando').length;
  const pending = rows.filter((row) => row.status !== 'Pagado' && row.status !== 'Validando' && row.status !== 'Recibe').length;

  if (process.env.NODE_ENV === 'development') {
    const rawPayments = params.payments.filter((p) => p.junta_id === params.junta.id);
    const pendingRows = rows.filter((r) => r.status !== 'Pagado' && r.status !== 'Validando' && r.status !== 'Recibe');
    const submittedRows = rows.filter((r) => r.status === 'Pagado' || r.status === 'Validando');
    console.debug('[PAYMENT UI STATE DEBUG]', {
      currentUserId: params.userId,
      semanaActual: params.currentWeek,
      rawPayments,
      schedules: params.schedules.filter((s) => s.junta_id === params.junta.id),
      currentScheduleId: currentSchedule?.id,
      memberRows: rows,
      paidOrSubmitted: submittedRows,
      pendingRows,
      submittedRows,
    });
  }

  return { currentSchedule, receiver, rows, paid, pending };
}

export function getCurrentWeekPaymentRows(params: {
  junta: Junta;
  members: JuntaMember[];
  payments: Payment[];
  currentWeek: number;
  currentSchedule?: PaymentSchedule;
  receiverProfileId?: string;
  userId?: string;
  juntaActiva: boolean;
}): WeeklyMemberRow[] {
  const amount = params.junta.cuota_base ?? params.junta.monto_cuota;
  return params.members.map((member, index) => {
    // Primary lookup: match by schedule_id (precise, week-scoped)
    const bySchedule = params.currentSchedule
      ? params.payments.find(
          (item) =>
            item.junta_id === params.junta.id &&
            item.profile_id === member.profile_id &&
            item.schedule_id === params.currentSchedule!.id
        )
      : undefined;
    // Fallback: no schedule in store yet — find the most recently submitted payment
    // for this member/junta so UI reflects optimistic store state right after submit.
    const byMostRecent =
      !bySchedule && !params.currentSchedule
        ? params.payments
            .filter(
              (item) =>
                item.junta_id === params.junta.id && item.profile_id === member.profile_id
            )
            .sort(
              (a, b) =>
                (b.submitted_at ?? b.pagado_en ?? '').localeCompare(
                  a.submitted_at ?? a.pagado_en ?? ''
                )
            )[0]
        : undefined;
    const payment = bySchedule ?? byMostRecent;
    if (process.env.NODE_ENV === 'development') {
      console.debug('[PAYMENT ROW DEBUG]', {
        pagoId: payment?.id,
        profileId: member.profile_id,
        currentUserId: params.userId,
        estadoPago: payment?.estado,
        paymentStatus: payment?.payment_status,
        scheduleId: params.currentSchedule?.id,
        paymentScheduleId: payment?.schedule_id,
        matchedVia: bySchedule ? 'schedule_id' : byMostRecent ? 'most_recent_fallback' : 'none',
        rawPago: payment,
      });
    }
    const isReceiver = member.profile_id === params.receiverProfileId;
    const displayName =
      member.profile_id === params.userId
        ? 'Tú'
        : member.nombre ?? (member.profile_id === params.junta.admin_id ? 'Creador' : `Integrante ${index + 1}`);
    return {
      id: member.id,
      profileId: member.profile_id,
      displayName,
      celular: member.celular,
      turno: member.orden_turno,
      score: Math.max(62, 95 - Math.abs(member.orden_turno - params.currentWeek) * 3),
      status: resolvePaymentStatus({ juntaActiva: params.juntaActiva, schedule: params.currentSchedule, payment, isReceiver }),
      amount,
      isReceiver,
      isCurrentUser: member.profile_id === params.userId,
      paymentId: payment?.id,
    };
  });
}

export function getPaidParticipants(rows: WeeklyMemberRow[]) {
  return rows.filter((row) => row.status === 'Pagado' || row.status === 'Validando');
}

export function getPendingPayers(rows: WeeklyMemberRow[]) {
  return rows.filter((row) => row.status !== 'Pagado' && row.status !== 'Validando' && row.status !== 'Recibe');
}

export function getTurnSchedule(params: {
  rows: SimulatedRound[];
  currentWeek: number;
  receiverTurn?: number | null;
}) {
  return params.rows.map((row) => ({
    ...row,
    weekStatus:
      row.turno < params.currentWeek
        ? 'Entregado'
        : row.turno === params.currentWeek
          ? 'En curso'
          : 'Por venir',
    isUserTurn: params.receiverTurn != null && row.turno === params.receiverTurn,
    isCurrentWeek: row.turno === params.currentWeek
  }));
}

export function getUserPersonalJuntaView(params: {
  junta: Junta;
  currentWeek: number;
  weeklyRows: WeeklyMemberRow[];
  myTurn: number | null;
  simulationRows: SimulatedRound[];
}) {
  const thisWeekReceiver = params.weeklyRows.find((row) => row.isReceiver) ?? null;
  const myRow = params.weeklyRows.find((row) => row.isCurrentUser) ?? null;
  const myTurnRow = params.myTurn ? params.simulationRows.find((row) => row.turno === params.myTurn) ?? null : null;
  const thisWeekRow = params.simulationRows.find((row) => row.turno === params.currentWeek) ?? null;
  const paidCount = params.weeklyRows.filter((row) => row.status === 'Pagado').length;
  return {
    thisWeekReceiver,
    myRow,
    myTurnRow,
    thisWeekRow,
    paidCount,
    progressLabel: `${paidCount}/${params.weeklyRows.length} ya pagaron`
  };
}
