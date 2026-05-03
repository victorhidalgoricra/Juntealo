'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
import { normalizePaymentStatus, paymentStatusLabel } from '@/lib/payment-status';
import { isJuntaActive } from '@/lib/junta-status';
import { hasSupabase } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import type { JuntaMember, Profile } from '@/types/domain';
import { fetchJuntaActiveMembers, submitPayment } from '@/services/juntas.repository';
import { fetchReceiverPayoutInfo } from '@/services/profile.service';
import { getParticipantDisplayName, getReceiverPaymentDetails } from '@/lib/payment-instructions';
import {
  PAYMENT_RECEIPT_ACCEPT,
  PaymentReceiptUploadError,
  uploadPaymentReceiptFile,
  validatePaymentReceiptFile
} from '@/services/payment-receipt-upload.service';
import { generarCronograma } from '@/services/schedule.service';
import { formatCalendarDate } from '@/lib/calendar-date';

export default function JuntaPayPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const { juntas, schedules, payments, setData } = useAppStore();

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

  const [activeMembers, setActiveMembers] = useState<JuntaMember[] | null>(null);
  const [loadingMembership, setLoadingMembership] = useState(true);
  const [receiverProfile, setReceiverProfile] = useState<Partial<Profile> | null>(null);

  const isMember = isCreator || Boolean(activeMembers?.some((m) => m.profile_id === user?.id && m.estado === 'activo'));
  const currentReceiverMember = activeMembers && currentSchedule
    ? (activeMembers.find((m) => m.orden_turno === currentSchedule.cuota_numero) ?? null)
    : null;
  const isCurrentReceiver = Boolean(user?.id && currentReceiverMember?.profile_id && user.id === currentReceiverMember.profile_id);

  const existingPayment = payments.find(
    (payment) => payment.junta_id === params.id && payment.profile_id === user?.id && payment.schedule_id === currentSchedule?.id
  );

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

  const currentStatus = normalizePaymentStatus(existingPayment?.estado);
  const canSubmitPayment = !existingPayment || currentStatus === 'pending' || currentStatus === 'rejected' || currentStatus === 'overdue';
  const alreadyPaid = currentStatus === 'approved';
  const isUnderValidation = currentStatus === 'submitted' || currentStatus === 'validating';

  const scheduleLabel = useMemo(() => {
    if (!currentSchedule) return 'Ronda no disponible';
    return `Semana ${currentSchedule.cuota_numero} · vence ${formatCalendarDate(currentSchedule.fecha_vencimiento)}`;
  }, [currentSchedule]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!junta) return;
    if (juntaSchedules.length > 0) return;

    const fallbackSchedules = generarCronograma({
      juntaId: junta.id,
      participantes: junta.participantes_max,
      monto: junta.cuota_base ?? junta.monto_cuota,
      frecuencia: junta.frecuencia_pago,
      fechaInicio: junta.fecha_inicio
    });
    setData({ schedules: [...schedules, ...fallbackSchedules] });

    if (process.env.NODE_ENV === 'development') {
      console.log('[Registrar pago debug] schedule fallback generado', {
        juntaId: junta.id,
        generatedRounds: fallbackSchedules.length
      });
    }
  }, [junta, juntaSchedules.length, schedules, setData]);

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

  useEffect(() => {
    if (!currentReceiverMember?.profile_id) return;
    fetchReceiverPayoutInfo({ juntaId: params.id, profileId: currentReceiverMember.profile_id }).then((result) => {
      if (!result.ok) {
        console.error('[Registrar pago] fetchReceiverPayoutInfo falló:', result.message, {
          juntaId: params.id,
          profileId: currentReceiverMember.profile_id
        });
      }
      setReceiverProfile(result.ok ? result.data : null);
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
  if (loadingMembership) return <Card>Verificando membresía...</Card>;
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

      const nextPayment = {
        id: paymentId,
        junta_id: junta.id,
        schedule_id: currentSchedule.id,
        round_id: currentSchedule.id,
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

      setData({
        payments: existingPayment
          ? payments.map((payment) => (payment.id === existingPayment.id ? { ...payment, ...nextPayment } : payment))
          : [...payments, nextPayment]
      });

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

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card className="space-y-2">
        <h1 className="text-2xl font-semibold">Registrar pago</h1>
        <p className="text-sm text-slate-600">{junta.nombre}</p>
        <p className="text-sm text-slate-600">{scheduleLabel}</p>
        <p className="text-sm text-slate-600">Monto esperado: <span className="font-semibold">S/ {currentSchedule.monto.toFixed(2)}</span></p>
        <p className="text-sm text-slate-600">Fecha límite: <span className="font-semibold">{formatCalendarDate(currentSchedule.fecha_vencimiento)}</span></p>
        <p className="text-sm text-slate-600">Estado actual: <span className="font-semibold">{paymentStatusLabel(currentStatus)}</span></p>
        {alreadyPaid && <p className="text-sm font-medium text-emerald-700">Pago ya registrado</p>}
        {isUnderValidation && <p className="text-sm font-medium text-blue-700">Tu pago está en validación</p>}
      </Card>

      {currentReceiverMember && (
        <Card className="space-y-2 border-blue-200 bg-blue-50">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Destinatario del pozo</p>
          <p className="font-semibold text-slate-800">Paga a: {receiverDisplayName}</p>
          <p className="text-sm text-slate-600">Turno: <span className="font-medium">#{currentSchedule.cuota_numero}</span></p>
          <p className="text-sm text-slate-600">Monto: <span className="font-medium">S/ {currentSchedule.monto.toFixed(2)}</span></p>
          {receiverPaymentDetails.isConfigured ? (
            <div className="space-y-1 border-t border-blue-200 pt-2">
              <p className="text-sm font-medium text-slate-700">Método sugerido: {receiverPaymentDetails.methodLabel}</p>
              {receiverPaymentDetails.destinationLabel && receiverPaymentDetails.destinationValue && (
                <p className="text-sm text-slate-600">{receiverPaymentDetails.destinationLabel}: <span className="font-medium">{receiverPaymentDetails.destinationValue}</span></p>
              )}
              {receiverPaymentDetails.secondaryLabel && receiverPaymentDetails.secondaryValue && (
                <p className="text-sm text-slate-600">{receiverPaymentDetails.secondaryLabel}: <span className="font-medium">{receiverPaymentDetails.secondaryValue}</span></p>
              )}
              {receiverPaymentDetails.notes && (
                <p className="text-sm text-slate-500">Nota: {receiverPaymentDetails.notes}</p>
              )}
              <p className="pt-1 text-xs font-medium text-blue-700">Transfiere a este destinatario y luego registra tu pago abajo.</p>
            </div>
          ) : (
            <p className="border-t border-blue-200 pt-2 text-sm text-amber-700">El receptor aún no configuró sus datos de pago. Coordina con él antes de registrar el pago.</p>
          )}
        </Card>
      )}

      <form onSubmit={submitVoucher} className="space-y-3">
        <Card className="space-y-3">
          <label className="text-sm font-medium">Monto de la cuota (fijo)</label>
          <Input type="number" value={monto} readOnly />

          <label className="text-sm font-medium">Método de pago</label>
          <select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" value={method} disabled={isUnderValidation || alreadyPaid} onChange={(event) => setMethod(event.target.value as 'yape' | 'plin' | 'transferencia' | 'efectivo' | 'otro')}>
            <option value="yape">Yape</option>
            <option value="plin">Plin</option>
            <option value="transferencia">Transferencia</option>
            <option value="efectivo">Efectivo</option>
            <option value="otro">Otro</option>
          </select>

          <label className="text-sm font-medium">Número de operación (opcional)</label>
          <Input value={operationNumber} disabled={isUnderValidation || alreadyPaid} onChange={(event) => setOperationNumber(event.target.value)} />

          <label className="text-sm font-medium">Voucher / comprobante (opcional · JPG, PNG o PDF)</label>
          <Input
            type="file"
            accept={PAYMENT_RECEIPT_ACCEPT}
            disabled={isUnderValidation || alreadyPaid}
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
          {fileName && <p className="text-xs text-slate-500">Archivo seleccionado: {fileName}</p>}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {previewUrl && <img src={previewUrl} alt="Preview del comprobante" className="max-h-60 rounded-md border object-contain" />}
          {!previewUrl && receiptFile?.type === 'application/pdf' && <p className="text-xs text-blue-700">PDF cargado correctamente. Se enviará como comprobante.</p>}

          <label className="text-sm font-medium">Observación (opcional)</label>
          <textarea className="min-h-24 w-full rounded-md border border-slate-300 p-3 text-sm" value={note} disabled={isUnderValidation || alreadyPaid} onChange={(event) => setNote(event.target.value)} />
        </Card>

        {message && <p className="text-sm text-blue-700">{message}</p>}

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting || alreadyPaid || isUnderValidation}>{submitting ? 'Enviando...' : isFromDashboard ? 'Confirmar pago' : 'Enviar a validación'}</Button>
          <Button type="button" variant="outline" onClick={() => router.push(`/juntas/${junta.id}?view=participante`)}>Volver</Button>
        </div>
      </form>
    </div>
  );
}
