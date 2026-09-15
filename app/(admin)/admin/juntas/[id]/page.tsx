'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
import { isBackofficeAdmin } from '@/services/auth-role.service';
import {
  adminSoftDeleteJunta,
  fetchJuntaById,
  fetchMembersByJuntaIds,
  fetchPaymentsByJuntaId,
  fetchSchedulesByJuntaId,
  isAdminJuntaDeletedOrSoftDeleted,
  isAdminJuntaNotActionable
} from '@/services/juntas.repository';
import { Junta } from '@/types/domain';
import { formatCalendarDate } from '@/lib/calendar-date';
import { getJuntaDisplayCode, getJuntaDisplayTitle } from '@/lib/junta-display';
import { formatAmount } from '@/lib/number-format';

type DetailSection = 'miembros' | 'rondas' | 'pagos';

export default function AdminJuntaDetailPage({ params }: { params: { id: string } }) {
  const user = useAuthStore((s) => s.user);
  const { payments, schedules, members, setData } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [junta, setJunta] = useState<Junta | null>(null);
  const [detailSection, setDetailSection] = useState<DetailSection>('miembros');
  const [detailQuery, setDetailQuery] = useState('');
  const [detailStatus, setDetailStatus] = useState('todos');

  useEffect(() => {
    if (!isBackofficeAdmin(user)) return;

    const load = async () => {
      setLoading(true);
      const result = await fetchJuntaById(params.id);
      if (!result.ok) {
        setError(result.message);
        setLoading(false);
        return;
      }

      setJunta(result.data);

      const [membersResult, schedulesResult, paymentsResult] = await Promise.all([
        fetchMembersByJuntaIds([params.id]),
        fetchSchedulesByJuntaId(params.id),
        fetchPaymentsByJuntaId(params.id)
      ]);
      setData({
        ...(membersResult.ok ? { members: membersResult.data } : {}),
        ...(schedulesResult.ok ? { schedules: schedulesResult.data } : {}),
        ...(paymentsResult.ok ? { payments: paymentsResult.data } : {})
      });

      setLoading(false);
    };

    load();
  }, [params.id, setData, user]);

  useEffect(() => {
    if (!junta) return;
    const previousTitle = document.title;
    document.title = `${getJuntaDisplayTitle(junta)} | Administración`;
    return () => { document.title = previousTitle; };
  }, [junta]);

  useEffect(() => {
    setDetailStatus('todos');
  }, [detailSection]);

  const stats = useMemo(() => {
    if (!junta) return { memberCount: 0, schedulesCount: 0, paymentsCount: 0 };
    return {
      memberCount: members.filter((m) => m.junta_id === junta.id).length,
      schedulesCount: schedules.filter((s) => s.junta_id === junta.id).length,
      paymentsCount: payments.filter((p) => p.junta_id === junta.id).length
    };
  }, [junta, members, payments, schedules]);

  const juntaMembers = useMemo(() => members.filter((member) => member.junta_id === junta?.id), [junta?.id, members]);
  const juntaSchedules = useMemo(() => schedules.filter((schedule) => schedule.junta_id === junta?.id), [junta?.id, schedules]);
  const juntaPayments = useMemo(() => payments.filter((payment) => payment.junta_id === junta?.id), [junta?.id, payments]);
  const normalizedDetailQuery = detailQuery.trim().toLowerCase();
  const filteredMembers = useMemo(() => juntaMembers.filter((member) => {
    if (detailStatus !== 'todos' && member.estado !== detailStatus) return false;
    return !normalizedDetailQuery || [member.nombre, member.celular, member.profile_id]
      .filter(Boolean).join(' ').toLowerCase().includes(normalizedDetailQuery);
  }), [detailStatus, juntaMembers, normalizedDetailQuery]);
  const filteredSchedules = useMemo(() => juntaSchedules.filter((schedule) => {
    if (detailStatus !== 'todos' && schedule.estado !== detailStatus) return false;
    return !normalizedDetailQuery || String(schedule.cuota_numero).includes(normalizedDetailQuery);
  }), [detailStatus, juntaSchedules, normalizedDetailQuery]);
  const filteredPayments = useMemo(() => juntaPayments.filter((payment) => {
    const paymentStatus = payment.payment_status ?? payment.estado;
    if (detailStatus !== 'todos' && paymentStatus !== detailStatus) return false;
    return !normalizedDetailQuery || [payment.profile_id, payment.operation_number, payment.payment_method]
      .filter(Boolean).join(' ').toLowerCase().includes(normalizedDetailQuery);
  }), [detailStatus, juntaPayments, normalizedDetailQuery]);

  const isJuntaNotActionable = junta ? isAdminJuntaNotActionable(junta) : false;
  const estadoVisual = junta
    ? isAdminJuntaDeletedOrSoftDeleted(junta)
      ? 'Eliminada'
      : isJuntaNotActionable
        ? 'Bloqueada'
        : junta.estado
    : undefined;

  if (!isBackofficeAdmin(user)) {
    return <Card><p className="text-sm text-slate-600">No tienes permisos para ver esta vista.</p></Card>;
  }

  if (loading) return <Card><p className="text-sm text-slate-600">Cargando detalle de junta...</p></Card>;
  if (error) return <Card><p className="text-sm text-red-600">{error}</p></Card>;
  if (!junta) return <Card><p className="text-sm text-slate-600">Junta no encontrada.</p></Card>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-semibold">{getJuntaDisplayTitle(junta)}</h1>
          <p className="text-sm text-slate-600">Revisión operativa y acción de eliminación administrativa.</p>
        </div>
        <Link href="/admin/juntas"><Button variant="outline">Volver al listado</Button></Link>
      </div>

      <Card className={`space-y-3 p-4 ${isJuntaNotActionable ? 'text-slate-500 opacity-75' : ''}`}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="break-words text-xl font-semibold">Detalle de la junta</h2>
          <Badge className="border border-slate-200 bg-slate-50 text-slate-700">Código: {getJuntaDisplayCode(junta)}</Badge>
          <Badge className={isJuntaNotActionable ? 'border border-slate-200 bg-slate-100 text-slate-500' : undefined}>
            {estadoVisual}
          </Badge>
          {isJuntaNotActionable && (
            <Badge className="border border-slate-200 bg-slate-100 text-slate-500">
              {isAdminJuntaDeletedOrSoftDeleted(junta) ? 'Registro eliminado' : 'Sin acciones'}
            </Badge>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-3 text-sm">
          <p className="break-all"><span className="font-medium">Admin:</span> {junta.admin_id}</p>
          <p><span className="font-medium">Tipo:</span> {junta.tipo_junta ?? 'normal'}</p>
          <p><span className="font-medium">Visibilidad:</span> {junta.visibilidad}</p>
          <p><span className="font-medium">Frecuencia:</span> {junta.frecuencia_pago}</p>
          <p><span className="font-medium">Inicio:</span> {formatCalendarDate(junta.fecha_inicio)}</p>
          <p><span className="font-medium">Creación:</span> {new Date(junta.created_at).toLocaleDateString('es-PE')}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Card><p className="text-xs text-slate-500">Miembros</p><p className="text-2xl font-semibold">{stats.memberCount}</p></Card>
          <Card><p className="text-xs text-slate-500">Rondas programadas</p><p className="text-2xl font-semibold">{stats.schedulesCount}</p></Card>
          <Card><p className="text-xs text-slate-500">Pagos registrados</p><p className="text-2xl font-semibold">{stats.paymentsCount}</p></Card>
        </div>

        <div className="space-y-3 border-t pt-4">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Detalle operativo">
            {([
              ['miembros', `Miembros (${stats.memberCount})`],
              ['rondas', `Rondas (${stats.schedulesCount})`],
              ['pagos', `Pagos (${stats.paymentsCount})`]
            ] as const).map(([section, label]) => (
              <Button key={section} variant={detailSection === section ? 'default' : 'outline'} onClick={() => setDetailSection(section)}>
                {label}
              </Button>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px]">
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={detailQuery}
              onChange={(event) => setDetailQuery(event.target.value)}
              placeholder={detailSection === 'miembros' ? 'Buscar por nombre, celular o ID' : detailSection === 'rondas' ? 'Buscar por número de ronda' : 'Buscar por participante, operación o método'}
            />
            <select className="w-full rounded-md border px-3 py-2 text-sm" value={detailStatus} onChange={(event) => setDetailStatus(event.target.value)}>
              <option value="todos">Estado: todos</option>
              {detailSection === 'miembros' && <><option value="activo">Activo</option><option value="pendiente">Pendiente</option><option value="moroso">Moroso</option><option value="retirado">Retirado</option></>}
              {detailSection === 'rondas' && <><option value="pendiente">Pendiente</option><option value="pagada">Pagada</option><option value="vencida">Vencida</option></>}
              {detailSection === 'pagos' && <><option value="pending">Pendiente</option><option value="submitted">Enviado</option><option value="validating">Validando</option><option value="approved">Aprobado</option><option value="rejected">Rechazado</option><option value="overdue">Vencido</option></>}
            </select>
          </div>

          <div className="overflow-x-auto rounded-md border">
            {detailSection === 'miembros' && <table className="w-full min-w-[620px] text-sm"><thead className="bg-slate-50 text-left"><tr><th className="px-3 py-2">Nombre</th><th className="px-3 py-2">Rol</th><th className="px-3 py-2">Turno</th><th className="px-3 py-2">Estado</th></tr></thead><tbody>{filteredMembers.map((member) => <tr className="border-t" key={member.id}><td className="px-3 py-2"><p className="font-medium">{member.nombre ?? 'Sin nombre'}</p><p className="text-xs text-slate-500">{member.celular ?? member.profile_id}</p></td><td className="px-3 py-2 capitalize">{member.rol ?? 'participante'}</td><td className="px-3 py-2">{member.orden_turno || '—'}</td><td className="px-3 py-2 capitalize">{member.estado}</td></tr>)}</tbody></table>}
            {detailSection === 'rondas' && <table className="w-full min-w-[620px] text-sm"><thead className="bg-slate-50 text-left"><tr><th className="px-3 py-2">Ronda</th><th className="px-3 py-2">Vencimiento</th><th className="px-3 py-2">Monto</th><th className="px-3 py-2">Estado</th></tr></thead><tbody>{filteredSchedules.map((schedule) => <tr className="border-t" key={schedule.id}><td className="px-3 py-2 font-medium">#{schedule.cuota_numero}</td><td className="px-3 py-2">{formatCalendarDate(schedule.fecha_vencimiento)}</td><td className="px-3 py-2">{junta.moneda} {formatAmount(schedule.monto)}</td><td className="px-3 py-2 capitalize">{schedule.estado}</td></tr>)}</tbody></table>}
            {detailSection === 'pagos' && <table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50 text-left"><tr><th className="px-3 py-2">Participante</th><th className="px-3 py-2">Operación</th><th className="px-3 py-2">Método</th><th className="px-3 py-2">Monto</th><th className="px-3 py-2">Estado</th></tr></thead><tbody>{filteredPayments.map((payment) => <tr className="border-t" key={payment.id}><td className="px-3 py-2 break-all">{juntaMembers.find((member) => member.profile_id === payment.profile_id)?.nombre ?? payment.profile_id}</td><td className="px-3 py-2">{payment.operation_number ?? '—'}</td><td className="px-3 py-2 capitalize">{payment.payment_method ?? '—'}</td><td className="px-3 py-2">{junta.moneda} {formatAmount(payment.monto)}</td><td className="px-3 py-2 capitalize">{payment.payment_status ?? payment.estado}</td></tr>)}</tbody></table>}
            {((detailSection === 'miembros' && filteredMembers.length === 0) || (detailSection === 'rondas' && filteredSchedules.length === 0) || (detailSection === 'pagos' && filteredPayments.length === 0)) && <p className="p-4 text-sm text-slate-500">No hay resultados para los filtros seleccionados.</p>}
          </div>
        </div>

        {!isJuntaNotActionable && (
          <div className="pt-2">
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={async () => {
                const warning = junta.estado === 'activa'
                  ? 'Esta junta se encuentra activa. Esta acción administrativa la eliminará del sistema y puede afectar participantes, turnos y trazabilidad. ¿Deseas continuar?'
                  : 'Esta acción administrativa marcará la junta como cancelada/bloqueada. ¿Deseas continuar?';
                if (!window.confirm(warning)) return;

                setIsDeleting(true);
                const result = await adminSoftDeleteJunta({ juntaId: junta.id });
                if (!result.ok) {
                  setError(result.message);
                  setIsDeleting(false);
                  return;
                }

                setJunta((previous) => (previous ? {
                  ...previous,
                  bloqueada: true,
                  cerrar_inscripciones: true,
                  deleted_at: 'deleted_at' in result.data ? result.data.deleted_at : new Date().toISOString(),
                  estado: 'eliminada'
                } : previous));
                setData({ juntas: [] });
                setIsDeleting(false);
              }}
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar junta'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
