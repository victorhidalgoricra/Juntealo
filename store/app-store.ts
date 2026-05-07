'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Junta, JuntaMember, Notification, Payment, PaymentSchedule, Payout } from '@/types/domain';

type State = {
  juntas: Junta[];
  members: JuntaMember[];
  schedules: PaymentSchedule[];
  payments: Payment[];
  payouts: Payout[];
  notifications: Notification[];
  isDataReady: boolean;
  setData: (partial: Partial<Omit<State, 'setData' | 'addNotification' | 'setIsDataReady'>>) => void;
  setIsDataReady: (v: boolean) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'created_at'> & { id?: string; created_at?: string }) => void;
};

export const useAppStore = create<State>()(
  persist(
    (set) => ({
      juntas: [],
      members: [],
      schedules: [],
      payments: [],
      payouts: [],
      notifications: [],
      isDataReady: false,
      setData: (partial) => set((state) => ({ ...state, ...partial })),
      setIsDataReady: (v) => set((state) => ({ ...state, isDataReady: v })),
      addNotification: (notification) => set((state) => ({
        ...state,
        notifications: [
          {
            id: notification.id ?? crypto.randomUUID(),
            created_at: notification.created_at ?? new Date().toISOString(),
            ...notification
          },
          ...state.notifications
        ]
      }))
    }),
    {
      name: 'jd-app',
      partialize: (state) => ({
        juntas: state.juntas,
        members: state.members,
        schedules: state.schedules,
        payments: state.payments,
        payouts: state.payouts,
        notifications: state.notifications,
      })
    }
  )
);
