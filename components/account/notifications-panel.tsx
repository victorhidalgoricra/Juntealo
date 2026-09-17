'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bell, CheckCheck, Clock3, Info, Mail, WalletCards } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

function emailDeliveryStyles(status: ProfileNotificationEmailStatus) {
  if (status === 'delivered' || status === 'sent') return 'bg-emerald-50 text-emerald-700';
  if (status === 'pending' || status === 'delayed') return 'bg-amber-50 text-amber-700';
  if (status === 'bounced' || status === 'complained' || status === 'failed') return 'bg-red-50 text-red-700';
  return 'bg-slate-100 text-slate-600';
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

  const reminderNotifications = notifications.filter(
    (notification) => notification.tipo === 'payment-reminder' || notification.tipo === 'payout-method-reminder'
  );
  const otherNotifications = notifications.filter(
    (notification) => notification.tipo !== 'payment-reminder' && notification.tipo !== 'payout-method-reminder'
  );

  return (
    <Card className="space-y-4 p-3 sm:p-5">
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-bg text-accent">
              <Bell size={16} aria-hidden="true" />
            </span>
            <h1 className="text-xl font-semibold text-fg">Notificaciones</h1>
          </div>
          <p className="mt-1.5 text-sm text-muted sm:ml-10">
            Mantente al día con tus pagos, recordatorios y avisos importantes.
          </p>
        </div>
        <Button className="w-full shrink-0 sm:w-auto" variant="outline" size="sm" onClick={handleMarkAllRead}>
          <CheckCheck size={15} aria-hidden="true" />
          Marcar leídas
        </Button>
      </div>

      <div className="space-y-4">
        <section className="space-y-2.5 rounded-[var(--r)] border border-amber-200 bg-amber-50/60 p-3 sm:p-4" aria-labelledby="pending-payments-title">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <AlertTriangle size={15} aria-hidden="true" />
              </span>
              <div>
                <h2 id="pending-payments-title" className="text-sm font-semibold text-slate-900">Cuotas pendientes</h2>
                <p className="text-xs text-slate-600">Acciones que requieren tu atención</p>
              </div>
            </div>
            {debtNotifications.length > 0 && <Badge variant="amber">{debtNotifications.length}</Badge>}
          </div>

          {debtNotifications.length === 0 ? (
            <div className="rounded-[var(--r-sm)] border border-amber-100 bg-white/80 px-3 py-3">
              <p className="text-sm text-slate-600">No tienes cuotas pendientes por ahora.</p>
            </div>
          ) : (
            debtNotifications.map((item) => (
              <div key={item.id} className="rounded-[var(--r-sm)] border border-amber-100 bg-white p-3 shadow-[var(--shadow-sm)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-fg">
                      {item.juntaNombre} · {item.isMyReceivingTurn ? 'Ronda' : 'Cuota'} {item.cuotaNumero}
                    </p>
                    {item.isMyReceivingTurn ? (
                      <>
                        <p className="mt-1 text-sm text-slate-600">
                          Te toca recibir en esta ronda · inicia el {formatCalendarDate(item.dueDate)}
                        </p>
                        <p className="mt-1.5 text-xs font-medium text-blue-700">No necesitas registrar un pago en tu turno.</p>
                      </>
                    ) : (
                      <>
                        <p className="mt-1 text-sm text-slate-600">
                          Debes pagar a {item.receiverName?.trim() || 'el destinatario de la junta'}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                          <span className="font-semibold text-slate-900">{money(item.monto)}</span>
                          <span className="text-slate-300" aria-hidden="true">•</span>
                          <span className="flex items-center gap-1 text-slate-500">
                            <Clock3 size={12} aria-hidden="true" />
                            Vence {formatCalendarDate(item.dueDate)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {!item.isMyReceivingTurn && item.status === 'en_validacion' ? (
                    <Badge variant="amber" className="self-start sm:self-center">Pago enviado · en validación</Badge>
                  ) : !item.isMyReceivingTurn ? (
                    <Link className="block w-full sm:w-auto" href={`/juntas/${item.juntaId}/registrar-pago?juntaId=${encodeURIComponent(item.juntaId)}&cuotaId=${encodeURIComponent(item.cuotaId)}&src=notifications`}>
                      <Button className="w-full sm:w-auto" size="sm">
                        <WalletCards size={14} aria-hidden="true" />
                        Pagar
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </section>

        {reminderNotifications.length > 0 && (
          <section className="space-y-2.5 rounded-[var(--r)] border border-blue-100 bg-blue-50/50 p-3 sm:p-4" aria-labelledby="recent-activity-title">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <Mail size={14} aria-hidden="true" />
              </span>
              <div>
                <h2 id="recent-activity-title" className="text-sm font-semibold text-slate-900">Actividad reciente</h2>
                <p className="text-xs text-slate-600">Recordatorios y avisos enviados</p>
              </div>
            </div>

            {reminderNotifications.map((notification) => {
              const deliveryLabel = notification.email_status ? emailDeliveryLabel(notification.email_status) : null;
              return (
                <div className="rounded-[var(--r-sm)] border border-blue-100 bg-white p-3" key={notification.id}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {!notification.leida && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Sin leer" />}
                        <p className="text-sm font-semibold text-fg">{notification.titulo}</p>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">{notification.mensaje}</p>
                      <p className="mt-1.5 text-xs text-slate-400">{formatCalendarDate(notification.created_at)}</p>
                    </div>
                    {deliveryLabel && notification.email_status && (
                      <Badge className={`shrink-0 self-start ${emailDeliveryStyles(notification.email_status)}`}>{deliveryLabel}</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {otherNotifications.length > 0 && (
          <section className="space-y-2.5 rounded-[var(--r)] border border-slate-200 bg-slate-50/80 p-3 sm:p-4" aria-labelledby="other-notifications-title">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-200/70 text-slate-600">
                <Info size={14} aria-hidden="true" />
              </span>
              <h2 id="other-notifications-title" className="text-sm font-semibold text-slate-900">Otras notificaciones</h2>
            </div>

            {otherNotifications.map((notification) => (
              <div className="rounded-[var(--r-sm)] border border-slate-200 bg-white p-3" key={notification.id}>
                <div className="flex items-start gap-2">
                  {!notification.leida && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Sin leer" />}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-fg">{notification.titulo}</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{notification.mensaje}</p>
                    <p className="mt-1.5 text-xs text-slate-400">{formatCalendarDate(notification.created_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {notifications.length === 0 && (
          <div className="rounded-[var(--r)] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
            <Bell size={20} className="mx-auto text-slate-400" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium text-slate-700">No tienes notificaciones recientes.</p>
          </div>
        )}
      </div>
    </Card>
  );
}
