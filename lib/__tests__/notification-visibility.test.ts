import { describe, expect, it } from 'vitest';
import type { Notification } from '@/types/domain';
import { hideInactivePaymentReminders } from '@/lib/notification-visibility';

function notification(overrides: Partial<Notification>): Notification {
  return {
    id: 'notification-1',
    profile_id: 'profile-1',
    junta_id: 'junta-1',
    titulo: 'Aviso',
    mensaje: 'Mensaje',
    leida: false,
    created_at: '2026-09-16T00:00:00Z',
    ...overrides,
  };
}

describe('hideInactivePaymentReminders', () => {
  it('keeps payment reminders only when their junta is active', () => {
    const visible = hideInactivePaymentReminders([
      notification({ id: 'active', tipo: 'payment-reminder', junta_id: 'junta-1' }),
      notification({ id: 'deleted', tipo: 'payment-reminder', junta_id: 'junta-2' }),
      notification({ id: 'orphan', tipo: 'payment-reminder', junta_id: null }),
    ], ['junta-1']);

    expect(visible.map((item) => item.id)).toEqual(['active']);
  });

  it('keeps unrelated notifications even when their junta is no longer active', () => {
    const visible = hideInactivePaymentReminders([
      notification({ id: 'activity', tipo: 'payment-confirmed', junta_id: 'junta-2' }),
    ], []);

    expect(visible.map((item) => item.id)).toEqual(['activity']);
  });
});
