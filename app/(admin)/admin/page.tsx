'use client';

import Link from 'next/link';
import { ArrowUpRight, CreditCard, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
import { normalizePaymentStatus, paymentStatusLabel } from '@/lib/payment-status';
import { isBackofficeAdmin } from '@/services/auth-role.service';
import { formatSoles } from '@/lib/number-format';
import { ProductDashboard } from '@/components/admin/product-dashboard';

type AdminTab = 'resumen' | 'producto' | 'pagos' | 'usuarios' | 'calidad';

export default function AdminPage() {
  const { juntas, members, payments, schedules, setData } = useAppStore();
  const authUser = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<AdminTab>('resumen');
  const [notesByPayment, setNotesByPayment] = useState<Record<string, string>>({});

  if (!isBackofficeAdmin(authUser)) {
    return <Card><p className="text-sm text-slate-600">No tienes permisos para acceder al backoffice.</p></Card>;
  }

  const paymentRows = payments.map((payment) => {
    const junta = juntas.find((item) => item.id === payment.junta_id);
    const schedule = schedules.find((item) => item.id === payment.schedule_id);
    const status = normalizePaymentStatus(payment.estado);

    return {
      payment,
      status,
      juntaName: junta?.nombre ?? 'Junta',
      semana: schedule?.cuota_numero ?? '-',
      expectedAmount: payment.expected_amount ?? schedule?.monto ?? payment.monto,
      submittedAmount: payment.submitted_amount ?? payment.monto,
      submittedAt: payment.submitted_at ?? payment.pagado_en
    };
  });

  const reviewablePayments = paymentRows.filter((row) => row.status === 'submitted' || row.status === 'validating' || row.status === 'rejected');

  const userRows = (() => {
    const ids = Array.from(new Set(members.map((m) => m.profile_id)));
    return ids.map((id) => {
      const isCurrentUser = id === authUser?.id;
      return {
        id,
        nombre: isCurrentUser ? authUser?.nombre ?? 'Usuario backoffice' : 'Usuario plataforma',
        email: isCurrentUser ? authUser?.email ?? 'sin-correo' : 'sin-correo',
        celular: isCurrentUser ? authUser?.celular ?? 'sin-celular' : 'sin-celular',
        dni: isCurrentUser ? authUser?.dni ?? 'sin-dni' : 'sin-dni',
        estado: 'pendiente',
        juntas: members.filter((m) => m.profile_id === id).length,
        registradoEn: new Date().toISOString()
      };
    });
  })();

  const updatePaymentStatus = (paymentId: string, next: 'approved' | 'rejected' | 'validating') => {
    const now = new Date().toISOString();
    const note = notesByPayment[paymentId]?.trim();

    setData({
      payments: payments.map((payment) => payment.id === paymentId
        ? {
          ...payment,
          estado: next,
          payment_status: next,
          internal_note: note || payment.internal_note,
          validated_at: next === 'approved' || next === 'rejected' ? now : payment.validated_at,
          validated_by: next === 'approved' || next === 'rejected' ? (authUser?.id ?? 'backoffice') : payment.validated_by,
          rejection_reason: next === 'rejected' ? note || 'Rechazado por backoffice' : undefined
        }
        : payment)
    });
  };

  const deleteUser = (profileId: string) => {
    const ok = window.confirm('¿Seguro que deseas eliminar este usuario? Esta acción es irreversible.');
    if (!ok) return;

    setData({
      members: members.filter((member) => member.profile_id !== profileId),
      payments: payments.filter((payment) => payment.profile_id !== profileId)
    });
  };

  return (
    <main className="mx-auto max-w-[1560px] space-y-7 pb-8 text-slate-900">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight text-slate-950 sm:text-4xl">Backoffice</h1>
          <p className="mt-1 text-sm text-slate-500">Gestión y análisis de tu producto en un solo lugar.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/juntas"><Button variant="outline" className="h-10 gap-2 rounded-xl border-slate-200 px-3.5 text-slate-700 hover:border-blue-200 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><UsersRound className="h-4 w-4" aria-hidden="true" />Gestionar juntas</Button></Link>
          <Link href="/admin/pagos"><Button variant="outline" className="h-10 gap-2 rounded-xl border-slate-200 px-3.5 text-slate-700 hover:border-blue-200 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><CreditCard className="h-4 w-4" aria-hidden="true" />Validar pagos</Button></Link>
          <Link href="/dashboard"><Button variant="outline" className="h-10 gap-2 rounded-xl border-slate-200 px-3.5 text-slate-700 hover:border-blue-200 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><ArrowUpRight className="h-4 w-4" aria-hidden="true" />Ir al producto</Button></Link>
        </div>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label="Secciones del backoffice">
        {(['resumen', 'producto', 'pagos', 'usuarios', 'calidad'] as AdminTab[]).map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} aria-current={tab === item ? 'page' : undefined} className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${tab === item ? 'border-blue-600 bg-blue-600 text-white shadow-[0_3px_10px_rgba(37,99,235,0.14)]' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'}`}>
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </nav>

      {tab === 'resumen' && (
        <ProductDashboard />
      )}

      {tab === 'producto' && <Card><p className="text-sm text-slate-500">El detalle de producto se incorporará en una siguiente iteración. El Resumen ya concentra las métricas principales.</p></Card>}

      {tab === 'pagos' && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Pagos para validación</h2>
          {reviewablePayments.length === 0 ? <p className="text-sm text-slate-500">No hay pagos pendientes por validar.</p> : reviewablePayments.map((row) => (
            <div key={row.payment.id} className="grid gap-2 rounded border p-3 text-sm md:grid-cols-[1.4fr_0.8fr_1fr_1fr_1fr_auto]">
              <div className="min-w-0">
                <p className="break-words font-semibold">{row.juntaName}</p>
                <p className="text-xs text-slate-500">Semana {row.semana} · {new Date(row.submittedAt).toLocaleDateString('es-PE')}</p>
              </div>
              <p>Esperado: {formatSoles(row.expectedAmount)}</p>
              <p>Enviado: {formatSoles(row.submittedAmount)}</p>
              <p>{row.payment.payment_method ?? 'Sin método'}</p>
              <p>{paymentStatusLabel(row.status)}</p>
              <div className="space-y-1">
                <input className="w-full rounded border px-2 py-1 text-xs" placeholder="Motivo / nota" value={notesByPayment[row.payment.id] ?? ''} onChange={(event) => setNotesByPayment((prev) => ({ ...prev, [row.payment.id]: event.target.value }))} />
                <div className="flex flex-wrap gap-1">
                  <Button variant="outline" onClick={() => updatePaymentStatus(row.payment.id, 'approved')}>Aprobar</Button>
                  <Button variant="destructive" onClick={() => updatePaymentStatus(row.payment.id, 'rejected')}>Rechazar</Button>
                  <Link href={`/admin/pagos/${row.payment.id}`}><Button variant="ghost">Ver detalle</Button></Link>
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}

      {tab === 'usuarios' && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Gestión de usuarios</h2>
          {userRows.length === 0 ? <p className="text-sm text-slate-500">No hay usuarios para mostrar.</p> : userRows.map((userRow) => (
            <div key={userRow.id} className="grid gap-2 rounded border p-3 text-sm md:grid-cols-[1.4fr_1fr_1fr_auto]">
              <div className="min-w-0">
                <p className="break-words font-medium">{userRow.nombre}</p>
                <p className="break-all text-xs text-slate-500">{userRow.email}</p>
                <p className="text-xs text-slate-500">{userRow.celular} · DNI {userRow.dni}</p>
              </div>
              <p>{userRow.juntas} juntas</p>
              <p>Registro: {new Date(userRow.registradoEn).toLocaleDateString('es-PE')}</p>
              <Button variant="destructive" onClick={() => deleteUser(userRow.id)}>Eliminar usuario</Button>
            </div>
          ))}
        </Card>
      )}

      {tab === 'calidad' && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Calidad de datos</h2>
          <p className="text-sm text-slate-500">El indicador resumido está disponible en Resumen. El detalle de incidencias se incorporará posteriormente.</p>
        </Card>
      )}
    </main>
  );
}
