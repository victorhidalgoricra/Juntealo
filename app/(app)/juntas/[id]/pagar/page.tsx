'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CalendarDays, Landmark, Upload, UserRound, WalletCards } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
import { normalizePaymentStatus, paymentStatusLabel } from '@/lib/payment-status';
import { isJuntaActive } from '@/lib/junta-status';
import { hasSupabase } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import type { JuntaMember, Payment, Profile } from '@/types/domain';
import { fetchExistingPaymentByMember, fetchJuntaActiveMembers, fetchJuntaById, fetchPaymentsByJuntaId, fetchSchedulesByJuntaId, sendPayoutMethodReminder, submitPayment } from '@/services/juntas.repository';
import { fetchReceiverPayoutInfo } from '@/services/profile.service';
import { getCurrentRoundReceiver, getParticipantDisplayName, getReceiverPaymentDetails } from '@/lib/payment-instructions';
import {
  PAYMENT_RECEIPT_ACCEPT,
  PaymentReceiptUploadError,
  uploadPaymentReceiptFile,
  validatePaymentReceiptFile
} from '@/services/payment-receipt-upload.service';
import { formatCalendarDate } from '@/lib/calendar-date';
import { formatSoles } from '@/lib/number-format';

export default function JuntaPayPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const { juntas, schedules, payments, setData } = useAppStore();
  const [loadingJunta, setLoadingJunta] = useState(true);

  const junta = juntas.find((item) => item.id === params.id);
  const juntaSchedules = schedules
    .filter((item) => item.junta_id === params.id)
    .sort((a, b) => a.cuota_numero - b.cuota_numero);
  const requestedCuotaId = searchParams.get('cuotaId');
  const isFromDashboard = searchParams.get('src') === 'dashboard';
  const today = new Date().toISOString().slice(0, 10);
  const currentSchedule = (requestedCuotaId ? juntaSchedules.find((item) => item.id === requestedCuotaId) : null)
    ?? juntaSchedules.find((item) => item.estado === 'pendiente')
    ?? juntaSchedules.find((item) => item.fecha_vencimiento >= today)
    ?? juntaSchedules[0];
  const isCreator = Boolean(user?.id && junta?.admin_id && user.id === junta.admin_id);

  const [isLoadingSchedules, setIsLoadingSchedules] = useState(true);
  const [activeMembers, setActiveMembers] = useState<JuntaMember[] | null>(null);
  const [loadingMembership, setLoadingMembership] = useState(true);
  const [receiverProfile, setReceiverProfile] = useState<Partial<Profile> | null>(null);
  const [isLoadingReceiverProfile, setIsLoadingReceiverProfile] = useState(true);
  const [receiverProfileError, setReceiverProfileError] = useState<string | null>(null);
  // dbPayment holds the payment fetched from DB when the store is empty (e.g. after re-login).
  const [dbPayment, setDbPayment] = useState<Payment | null | undefined>(undefined);

  const isMember = isCreator || Boolean(activeMembers?.some((m) => m.profile_id === user?.id && m.estado === 'activo'));
  const currentReceiverMember = activeMembers && currentSchedule
    ? getCurrentRoundReceiver({ schedule: currentSchedule, members: activeMembers })
    : null;
  const isCurrentReceiver = Boolean(user?.id && currentReceiverMember?.profile_id && user.id === currentReceiverMember.profile_id);

  const storePayment = payments.find(
    (payment) => payment.junta_id === params.id && payment.profile_id === user?.id && payment.schedule_id === currentSchedule?.id
  );
  // Prefer store payment (optimistic); fall back to DB payment (handles empty store after re-login).
  const existingPayment = storePayment ?? (dbPayment ?? undefined);

  const expectedAmount = currentSchedule?.monto ?? junta?.monto_cuota ?? 0;
  const monto = expectedAmount;
  const [method, setMethod] = useState<'yape' | 'plin' | 'transferencia' | 'efectivo' | 'otro'>(existingPayment?.payment_method ?? 'yape');
  const [operationNumber, setOperationNumber] = useState(existingPayment?.operation_number ?? '');
  const [note, setNote] = useState(existingPayment?.participant_note ?? '');
  const [fileName, setFileName] = useState(existingPayment?.receipt_url ?? existingPayment?.comprobante_url ?? '');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sendingPayoutReminder, setSendingPayoutReminder] = useState(false);
  const [payoutReminderSent, setPayoutReminderSent] = useState(false);
  const [payoutReminderMessage, setPayoutReminderMessage] = useState<string | null>(null);

  const currentStatus = normalizePaymentStatus(existingPayment?.estado);
  const canSubmitPayment = !existingPayment || currentStatus === 'pending' || currentStatus === 'rejected' || currentStatus === 'overdue';
  const alreadyPaid = currentStatus === 'approved';
  const isUnderValidation = currentStatus === 'submitted' || currentStatus === 'validating';

  const scheduleLabel = useMemo(() => {
    if (!currentSchedule) return 'Ronda no disponible';
    return `Semana ${currentSchedule.cuota_numero} · vence ${formatCalendarDate(currentSchedule.fecha_vencimiento)}`;
  }, [currentSchedule]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoadingSchedules(true);
      const [schedulesResult, paymentsResult, juntaResult] = await Promise.all([
        fetchSchedulesByJuntaId(params.id),
        fetchPaymentsByJuntaId(params.id),
        fetchJuntaById(params.id),
      ]);
      if (schedulesResult.ok) {
        setData({ schedules: [...schedules.filter((s) => s.junta_id !== params.id), ...schedulesResult.data] });
      }
      if (paymentsResult.ok) {
        setData({ payments: [...payments.filter((p) => p.junta_id !== params.id), ...paymentsResult.data] });
      }
      if (juntaResult.ok && juntaResult.data) {
        setData({ juntas: [...juntas.filter((j) => j.id !== params.id), juntaResult.data] });
      }
      setIsLoadingSchedules(false);
      setLoadingJunta(false);
    };
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    if (!user) {
      setLoadingMembership(false);
      return;
    }
    fetchJuntaActiveMembers(params.id).then((result) => {
      setActiveMembers(result.ok ? result.data : []);
      setLoadingMembership(false);
    });
  }, [params.id, user]);

  // Fetch existing payment from DB when not in store (e.g. empty store after re-login).
  useEffect(() => {
    if (!user?.id || !currentSchedule?.id) {
      setDbPayment(null);
      return;
    }
    if (storePayment) {
      setDbPayment(null); // store has it — no DB fetch needed
      return;
    }
    fetchExistingPaymentByMember({ juntaId: params.id, scheduleId: currentSchedule.id, profileId: user.id })
      .then((result) => {
        setDbPayment(result.ok ? result.data : null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSchedule?.id, user?.id, storePayment]);

  useEffect(() => {
    setReceiverProfile(null);
    setReceiverProfileError(null);
    setPayoutReminderSent(false);
    setPayoutReminderMessage(null);
    if (!currentReceiverMember?.profile_id) {
      setIsLoadingReceiverProfile(false);
      return;
    }
    setIsLoadingReceiverProfile(true);
    fetchReceiverPayoutInfo({ juntaId: params.id, profileId: currentReceiverMember.profile_id }).then((result) => {
      if (!result.ok) {
        console.error('[Registrar pago] fetchReceiverPayoutInfo falló:', result.message, {
          juntaId: params.id,
          profileId: currentReceiverMember.profile_id
        });
        setReceiverProfileError('No pudimos verificar los datos de pago del receptor. Inténtalo nuevamente.');
      }
      setReceiverProfile(result.ok ? result.data : null);
      setIsLoadingReceiverProfile(false);
    });
  }, [currentReceiverMember?.profile_id, params.id]);

  useEffect(() => {
    if (!receiptFile || receiptFile.type === 'application/pdf') {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(receiptFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [receiptFile]);


  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    console.debug('[PAYMENT LOAD STATE]', {
      isLoadingSchedules,
      schedulesLength: juntaSchedules.length,
      currentSchedule,
    });
  }, [isLoadingSchedules, juntaSchedules.length, currentSchedule]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    console.log('[Registrar pago debug]', {
      juntaId: junta?.id,
      juntaEstado: junta?.estado,
      currentScheduleId: currentSchedule?.id,
      currentScheduleCuota: currentSchedule?.cuota_numero,
      memberId: user?.id,
      isMember,
      isCreator,
      existingPaymentId: existingPayment?.id,
      existingPaymentStatus: existingPayment?.estado,
      blockerReason: !junta
        ? 'junta_missing'
        : !isJuntaActive(junta.estado)
          ? 'junta_inactive'
          : !isMember
            ? 'not_member'
            : !currentSchedule
              ? 'schedule_missing'
              : 'ready'
    });
  }, [currentSchedule, existingPayment, isCreator, isMember, junta, user]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const mappedPaymentMethods = getReceiverPaymentDetails(receiverProfile);
    console.debug('[RECEIVER PAYMENT METHODS DEBUG]', {
      receiverProfileId: currentReceiverMember?.profile_id,
      receiverName: currentReceiverMember?.nombre,
      paymentMethodsTableUsed: 'profiles (via get_receiver_payout_info RPC)',
      rawPaymentMethods: receiverProfile
        ? {
            preferred_payout_method: receiverProfile.preferred_payout_method,
            payout_phone_number: receiverProfile.payout_phone_number,
            celular: receiverProfile.celular,
            payout_bank_name: receiverProfile.payout_bank_name,
            payout_account_number: receiverProfile.payout_account_number,
            payout_cci: receiverProfile.payout_cci,
            payout_account_name: receiverProfile.payout_account_name,
            payout_notes: receiverProfile.payout_notes,
          }
        : null,
      mappedPaymentMethods,
      hasPaymentMethods: mappedPaymentMethods.isConfigured,
      rpcReturnedNull: receiverProfile === null,
      memberCelularFallback: currentReceiverMember?.celular ?? null,
    });
  }, [currentReceiverMember, receiverProfile]);

  if (!user) return <Card>Debes iniciar sesión.</Card>;
  if (isLoadingSchedules || loadingMembership || loadingJunta) return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card className="space-y-3 animate-pulse">
        <div className="h-6 w-40 rounded bg-slate-200" />
        <div className="h-4 w-32 rounded bg-slate-200" />
        <div className="h-4 w-48 rounded bg-slate-200" />
        <div className="h-4 w-36 rounded bg-slate-200" />
      </Card>
      <Card className="space-y-3 animate-pulse">
        <div className="h-4 w-full rounded bg-slate-200" />
        <div className="h-10 w-full rounded bg-slate-200" />
        <div className="h-4 w-full rounded bg-slate-200" />
        <div className="h-10 w-full rounded bg-slate-200" />
      </Card>
      <p className="text-center text-sm text-slate-500">Cargando tu cuota...</p>
    </div>
  );
  if (!isMember) return <Card>Solo los integrantes activos de esta junta pueden registrar pagos.</Card>;
  if (!junta || !currentSchedule) return <Card>No encontramos una cuota/ronda pendiente para esta junta.</Card>;
  if (!isJuntaActive(junta.estado)) return <Card>Aún no puedes registrar pagos porque la junta no está activa.</Card>;
  if (isCurrentReceiver) return <Card>Eres el receptor de esta semana. Los demás integrantes están pagando a tu favor.</Card>;

  const uploadReceiptIfNeeded = async () => {
    if (!receiptFile) return fileName || undefined;
    if (!hasSupabase || !supabase) return receiptFile.name;
    return uploadPaymentReceiptFile({
      supabase,
      file: receiptFile,
      juntaId: params.id,
      profileId: user.id,
      scheduleId: currentSchedule.id
    });
  };

  const submitVoucher = async (event: FormEvent) => {
    event.preventDefault();
    if (isLoadingReceiverProfile || receiverProfileError || !receiverPaymentDetails.isConfigured) {
      setMessage('El receptor debe configurar cómo recibir su pago antes de que puedas enviarlo a validación.');
      return;
    }
    if (!isJuntaActive(junta.estado)) {
      setMessage('La junta aún no está activa');
      return;
    }
    if (monto !== expectedAmount) {
      setMessage('Solo puedes registrar el monto completo de la cuota');
      return;
    }
    if (!canSubmitPayment) {
      setMessage('Ya tienes un pago enviado para esta cuota');
      return;
    }

    try {
      setSubmitting(true);
      const receiptUrl = await uploadReceiptIfNeeded();
      const paymentId = existingPayment?.id ?? crypto.randomUUID();
      const now = new Date().toISOString();
      const nextStatus = 'submitted' as const;

      const dbResult = await submitPayment({
        id: paymentId,
        juntaId: junta.id,
        scheduleId: currentSchedule.id,
        cuotaNumero: currentSchedule.cuota_numero,
        profileId: user.id,
        expectedAmount,
        monto,
        paymentMethod: method,
        operationNumber: operationNumber || undefined,
        participantNote: note || undefined,
        receiptUrl,
      });

      if (process.env.NODE_ENV === 'development') {
        console.debug('[PAYMENT SUBMIT DEBUG]', {
          juntaId: junta.id,
          semana: currentSchedule.cuota_numero,
          payerProfileId: user.id,
          receiverProfileId: currentReceiverMember?.profile_id,
          estadoAntes: existingPayment?.estado ?? 'none',
          estadoDespues: nextStatus,
          dbResult,
          error: null,
        });
      }

      if (!dbResult.ok) {
        throw new Error(dbResult.message ?? 'No pudimos guardar tu pago en la base de datos.');
      }

      const confirmedScheduleId = (dbResult.ok && dbResult.resolvedScheduleId) ? dbResult.resolvedScheduleId : currentSchedule.id;
      // Use the payment ID resolved by submitPayment (may differ from paymentId if DB already had one).
      const confirmedPaymentId = (dbResult.ok && (dbResult as { resolvedPaymentId?: string }).resolvedPaymentId)
        ? (dbResult as { resolvedPaymentId: string }).resolvedPaymentId
        : paymentId;
      const nextPayment = {
        id: confirmedPaymentId,
        junta_id: junta.id,
        schedule_id: confirmedScheduleId,
        round_id: confirmedScheduleId,
        member_id: user.id,
        profile_id: user.id,
        expected_amount: expectedAmount,
        submitted_amount: expectedAmount,
        monto,
        estado: nextStatus,
        receipt_url: receiptUrl,
        comprobante_url: receiptUrl,
        payment_method: method,
        operation_number: operationNumber || undefined,
        participant_note: note || undefined,
        internal_note: existingPayment?.internal_note,
        payment_status: nextStatus,
        submitted_at: now,
        pagado_en: now,
        validated_at: existingPayment?.validated_at,
        validated_by: existingPayment?.validated_by,
        rejection_reason: undefined
      };

      const prevPaymentId = existingPayment?.id;
      const updatedPayments = prevPaymentId
        ? payments.map((payment) => (payment.id === prevPaymentId ? { ...payment, ...nextPayment } : payment))
        : [...payments.filter((p) => !(p.junta_id === junta.id && p.profile_id === user.id && p.schedule_id === confirmedScheduleId)), nextPayment];
      setData({ payments: updatedPayments });

      if (process.env.NODE_ENV === 'development') {
        console.debug('[PAYMENT FLOW SYNC]', {
          afterPayment: true,
          profileId: user.id,
          juntaId: junta.id,
          scheduleId: confirmedScheduleId,
          newEstado: nextStatus,
          paymentsInStore: updatedPayments.filter((p) => p.junta_id === junta.id),
        });
      }

      setMessage('Tu pago fue enviado correctamente y está pendiente de validación');
      setTimeout(() => router.push(`/juntas/${junta.id}?view=participante`), 900);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[PAYMENT SUBMIT DEBUG]', {
          juntaId: junta.id,
          semana: currentSchedule.cuota_numero,
          payerProfileId: user.id,
          receiverProfileId: currentReceiverMember?.profile_id,
          estadoAntes: existingPayment?.estado ?? 'none',
          estadoDespues: 'error',
          dbResult: null,
          error,
        });
      }
      console.error('[Registrar pago] error', error);
      if (error instanceof PaymentReceiptUploadError) {
        console.error(error.technicalMessage);
        setMessage(error.userMessage);
      } else {
        setMessage(error instanceof Error ? error.message : 'No pudimos registrar tu pago.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const receiverPaymentDetails = getReceiverPaymentDetails(receiverProfile);
  // getParticipantDisplayName siempre retorna string no vacío ('Usuario sin nombre' como último fallback),
  // por lo que el operador || nunca llega al nombre del miembro.
  // Usamos el nombre del miembro (ya disponible desde get_junta_members_for_detail) cuando
  // receiverProfile es null (e.g. el RPC get_receiver_payout_info falló o aún no se aplicó).
  const memberNombre = currentReceiverMember?.nombre;
  const receiverProfileForName: Partial<Profile> | null =
    receiverProfile ?? (memberNombre ? { nombre: memberNombre } : null);
  const receiverDisplayName = getParticipantDisplayName(receiverProfileForName);
  const paymentSubmissionBlocked = isLoadingReceiverProfile || Boolean(receiverProfileError) || !receiverPaymentDetails.isConfigured;

  const handleSendPayoutMethodReminder = async () => {
    if (!currentReceiverMember?.profile_id || !currentSchedule?.id || sendingPayoutReminder || payoutReminderSent) return;

    setSendingPayoutReminder(true);
    setPayoutReminderMessage(null);
    const result = await sendPayoutMethodReminder({
      juntaId: junta.id,
      scheduleId: currentSchedule.id,
      profileId: currentReceiverMember.profile_id,
    });
    setSendingPayoutReminder(false);
    setPayoutReminderMessage(result.message);
    if (result.ok) setPayoutReminderSent(true);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-3 sm:space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Volver a la junta"
          onClick={() => router.push(`/juntas/${junta.id}?view=participante`)}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] text-slate-600 transition-colors hover:bg-accent-bg hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <ArrowLeft size={19} aria-hidden="true" />
        </button>
        <h1 className="truncate text-xl font-semibold text-fg sm:text-2xl">Registrar pago</h1>
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-6">
        <div className="space-y-3 sm:space-y-4">
          <Card className="space-y-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-bg text-accent">
              <Landmark size={17} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-fg">{junta.nombre}</p>
              <p className="mt-0.5 text-xs text-muted sm:text-sm">{scheduleLabel}</p>
            </div>
          </div>
          <Badge className="shrink-0">{paymentStatusLabel(currentStatus)}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
          <div>
            <p className="text-xs text-muted">Monto esperado</p>
            <p className="mt-0.5 font-semibold text-fg">{formatSoles(currentSchedule.monto)}</p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-xs text-muted">
              <CalendarDays size={13} aria-hidden="true" />
              Fecha límite
            </p>
            <p className="mt-0.5 font-semibold text-fg">{formatCalendarDate(currentSchedule.fecha_vencimiento)}</p>
          </div>
        </div>
        {alreadyPaid && <p className="text-sm font-medium text-emerald-700">Pago ya registrado</p>}
        {isUnderValidation && <p className="text-sm font-medium text-blue-700">Tu pago está en validación</p>}
          </Card>

          {currentReceiverMember && (
            <Card className="space-y-3 border-blue-200 bg-blue-50/80 p-4 sm:p-5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-blue-700">
            <UserRound size={14} aria-hidden="true" />
            Destinatario del pozo
          </p>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end sm:gap-5">
            <div>
              <p className="text-xs text-slate-500">Paga a</p>
              <p className="break-words font-semibold text-slate-800">{receiverDisplayName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Turno</p>
              <p className="text-sm font-semibold text-slate-800">#{currentSchedule.cuota_numero}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Monto</p>
              <p className="text-sm font-semibold text-slate-800">{formatSoles(currentSchedule.monto)}</p>
            </div>
          </div>
          {isLoadingReceiverProfile ? (
            <p className="border-t border-blue-200 pt-3 text-sm text-slate-600">Verificando sus datos de pago…</p>
          ) : receiverProfileError ? (
            <p className="border-t border-blue-200 pt-3 text-sm text-red-700" role="alert">{receiverProfileError}</p>
          ) : receiverPaymentDetails.isConfigured ? (
            <div className="space-y-1.5 border-t border-blue-200 pt-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <WalletCards size={15} className="text-blue-600" aria-hidden="true" />
                Método sugerido: {receiverPaymentDetails.methodLabel}
              </p>
              {receiverPaymentDetails.destinationLabel && receiverPaymentDetails.destinationValue && (
                <p className="break-all text-sm text-slate-600">{receiverPaymentDetails.destinationLabel}: <span className="font-medium">{receiverPaymentDetails.destinationValue}</span></p>
              )}
              {receiverPaymentDetails.secondaryLabel && receiverPaymentDetails.secondaryValue && (
                <p className="break-all text-sm text-slate-600">{receiverPaymentDetails.secondaryLabel}: <span className="font-medium">{receiverPaymentDetails.secondaryValue}</span></p>
              )}
              {receiverPaymentDetails.notes && (
                <p className="text-sm text-slate-500">Nota: {receiverPaymentDetails.notes}</p>
              )}
              <p className="pt-1.5 text-xs font-medium text-blue-700">Transfiere a este destinatario y luego registra tu pago abajo.</p>
            </div>
          ) : (
            <div className="space-y-3 border-t border-blue-200 pt-3">
              <div className="text-sm text-amber-800">
                <p className="font-medium">{receiverDisplayName} aún no configuró cómo recibir su pago.</p>
                <p className="mt-1">Le enviaremos un recordatorio para que complete sus datos.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={sendingPayoutReminder || payoutReminderSent}
                onClick={handleSendPayoutMethodReminder}
              >
                {sendingPayoutReminder ? 'Enviando…' : payoutReminderSent ? 'Recordatorio enviado' : 'Enviar recordatorio'}
              </Button>
              {payoutReminderMessage && (
                <p className={`text-xs ${payoutReminderSent ? 'text-emerald-700' : 'text-red-700'}`} role="status">
                  {payoutReminderMessage}
                </p>
              )}
            </div>
          )}
            </Card>
          )}
        </div>

        <form onSubmit={submitVoucher}>
          <Card className="space-y-4 p-4 sm:p-5">
          <div>
            <h2 className="text-lg font-semibold text-fg">Registrar tu pago</h2>
            <p className="mt-0.5 text-sm text-muted">Completa los datos de tu pago realizado.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="payment-amount" className="block text-sm font-medium">Monto de la cuota (fijo)</label>
                <div className="relative">
                  <Input id="payment-amount" type="number" value={monto} readOnly className="pr-11" />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-muted">S/</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="payment-method" className="block text-sm font-medium">Método de pago</label>
                <Select id="payment-method" value={method} disabled={isUnderValidation || alreadyPaid} onChange={(event) => setMethod(event.target.value as 'yape' | 'plin' | 'transferencia' | 'efectivo' | 'otro')}>
                  <option value="yape">Yape</option>
                  <option value="plin">Plin</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="otro">Otro</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="operation-number" className="block text-sm font-medium">Número de operación (opcional)</label>
                <Input id="operation-number" placeholder="Ej. 12345678" value={operationNumber} disabled={isUnderValidation || alreadyPaid} onChange={(event) => setOperationNumber(event.target.value)} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="payment-receipt" className="block text-sm font-medium">Voucher / comprobante <span className="font-normal text-muted">(opcional · JPG, PNG o PDF)</span></label>
                <label
                  htmlFor="payment-receipt"
                  className={`flex min-h-24 flex-col items-center justify-center rounded-[var(--r-sm)] border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-center transition-colors ${isUnderValidation || alreadyPaid ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-accent hover:bg-accent-bg'}`}
                >
                  <Upload size={20} className="mb-1.5 text-accent" aria-hidden="true" />
                  <span className="text-sm font-semibold text-fg">Seleccionar archivo</span>
                  <span className="mt-0.5 max-w-full break-all text-xs text-muted">{fileName || 'Sin archivos seleccionados'}</span>
                </label>
                <Input
                  id="payment-receipt"
                  type="file"
                  accept={PAYMENT_RECEIPT_ACCEPT}
                  disabled={isUnderValidation || alreadyPaid}
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const validationError = validatePaymentReceiptFile(file);
                    if (validationError) {
                      if (process.env.NODE_ENV === 'development') {
                        console.error(validationError.technicalMessage);
                      }
                      setMessage(validationError.userMessage);
                      return;
                    }
                    setReceiptFile(file);
                    setFileName(file.name);
                    setMessage(null);
                  }}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {previewUrl && <img src={previewUrl} alt="Preview del comprobante" className="max-h-48 w-full rounded-md border object-contain" />}
                {!previewUrl && receiptFile?.type === 'application/pdf' && <p className="text-xs text-blue-700">PDF cargado correctamente. Se enviará como comprobante.</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="payment-note" className="block text-sm font-medium">Observación (opcional)</label>
                <textarea id="payment-note" rows={3} placeholder="Escribe un comentario…" className="min-h-20 w-full resize-y rounded-[var(--r-sm)] border border-border bg-surface p-3 text-sm text-fg outline-none transition-[border-color,box-shadow] placeholder:text-faint focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-bg)] disabled:cursor-not-allowed disabled:opacity-50" value={note} disabled={isUnderValidation || alreadyPaid} onChange={(event) => setNote(event.target.value)} />
              </div>
            </div>
          </div>

          {message && <p className="text-sm text-blue-700" role="status">{message}</p>}

          <div className="space-y-2 pt-1">
            <Button className="w-full" type="submit" disabled={submitting || alreadyPaid || isUnderValidation || paymentSubmissionBlocked}>{submitting ? 'Enviando...' : isFromDashboard ? 'Confirmar pago' : 'Enviar a validación'}</Button>
            <Button className="w-full" type="button" variant="outline" onClick={() => router.push(`/juntas/${junta.id}?view=participante`)}>Volver</Button>
          </div>
          </Card>
        </form>
      </div>
    </div>
  );
}
