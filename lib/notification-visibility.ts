import type { Notification } from '@/types/domain';

export function hideInactivePaymentReminders(
  notifications: Notification[],
  activeJuntaIds: Iterable<string>,
) {
  const activeIds = new Set(activeJuntaIds);

  return notifications.filter((notification) => {
    if (notification.tipo !== 'payment-reminder') return true;
    return Boolean(notification.junta_id && activeIds.has(notification.junta_id));
  });
}
