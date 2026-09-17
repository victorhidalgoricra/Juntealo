'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
import { fetchProfilesByIds } from '@/services/profile.service';
import { markNotificationsRead } from '@/services/juntas.repository';
import { Profile } from '@/types/domain';
import { buildPaymentDebtItems, selectCurrentPaymentNoticeItems } from '@/lib/payment-debts';
import { formatCalendarDate } from '@/lib/calendar-date';
import { formatSoles } from '@/lib/number-format';

function money(value: number) {
  return formatSoles(value);
}

function emailDeliveryLabel(status: ProfileNotificationEmailStatus) {
  if (status === 'delivered') return 'Correo entregado';
  if (status === 'bounced') return 'El correo rebotó';
  if (status === 'complained') return 'Correo marcado como no deseado';
  if (status === 'failed') return 'No se pudo enviar el correo';
  if (status === 'delayed') return 'Correo demorado';
  if (status === 'sent') return 'Correo enviado';
  if (status === 'pending') return 'Correo pendiente';
  return null;
}

type ProfileNotificationEmailStatus = NonNullable<ReturnType<typeof useAppStore.getState>['notifications'][number]['email_status']>;

export function NotificationsPanel() {
  const user = useAuthStore((s) => s.user);
  const { notifications, juntas, members, schedules, payments, payouts, setData } = useAppStore();
  const [profilesById, setProfilesById] = useState<Record<string, Profile>>({});

  useEffect(() => {
    if (!user?.id) return;
    const ids = Array.from(new Set([user.id, ...members.map((member) => member.profile_id)]));
    fetchProfilesByIds(ids).then((result) => {
      if (!result.ok) return;
      const mapped = result.data.reduce<Record<string, Profile>>((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {});
      if (!mapped[user.id]) mapped[user.id] = user;
      setProfilesById(mapped);
    });
  }, [members, user]);

  const debtNotifications = useMemo(() => {
    const all = buildPaymentDebtItems({
      userId: user?.id ?? '',
      juntas,
      members,
      schedules,
      payments,
      payouts,
      profilesById,
      fallbackProfile: user,
    });
    return selectCurrentPaymentNoticeItems(all);
  }, [juntas, members, payments, payouts, profilesById, schedules, user]);

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.leida);
    if (unread.length === 0) return;
    setData({ notifications: notifications.map((n) => ({ ...n, leida: true })) });
    if (user?.id) {
      await markNotificationsRead(user.id, unread.map((n) => n.id));
    }
  };

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Notificaciones</h1>
        <Button variant="outline" onClick={handleMarkAllRead}>Marcar leídas</Button>
      </div>
      <div className="space-y-2">
        <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-900">Cuotas pendientes</p>
          {debtNotifications.length === 0 ? (
            <p className="text-sm text-slate-500">No tienes cuotas pendientes por ahora.</p>
          ) : (
            debtNotifications.map((item) => (
              <div key={item.id} className="rounded-md border bg-white p-2">
                {item.isMyReceivingTurn ? (
                  <>
                    <p className="text-sm font-medium">{item.juntaNombre} · Ronda {item.cuotaNumero}</p>
                    <p className="text-xs text-slate-600">
                      Te toca recibir en esta ronda · inicia el {formatCalendarDate(item.dueDate)}
                    </p>
                    <p className="mt-1 text-xs font-medium text-blue-700">No necesitas registrar un pago en tu turno.</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium">{item.juntaNombre} · Cuota {item.cuotaNumero}</p>
                    <p className="text-xs text-slate-600">
                      Debes pagar a {item.receiverName} · {money(item.monto)} · vence {formatCalendarDate(item.dueDate)}
                    </p>
                  </>
                )}
                {!item.isMyReceivingTurn && item.status === 'en_validacion' ? (
                  <p className="mt-1 text-xs font-medium text-amber-700">Pago enviado · en validación</p>
                ) : !item.isMyReceivingTurn ? (
                  <div className="mt-1">
                    <Link href={`/juntas/${item.juntaId}/registrar-pago?juntaId=${encodeURIComponent(item.juntaId)}&cuotaId=${encodeURIComponent(item.cuotaId)}&src=notifications`}>
                      <Button variant="outline">Pagar</Button>
                    </Link>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
        {notifications.length > 0 && notifications.map((n) => (
          <div className="rounded border p-2" key={n.id}>
            <p className="font-medium">{n.titulo}</p>
            <p className="text-sm">{n.mensaje}</p>
            {(n.tipo === 'payment-reminder' || n.tipo === 'payout-method-reminder') && n.email_status && emailDeliveryLabel(n.email_status) && (
              <p className="mt-1 text-xs text-slate-500">{emailDeliveryLabel(n.email_status)}</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
