'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useAppStore } from '@/store/app-store';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { hasSupabase } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { fetchUserJuntaSnapshot } from '@/services/juntas.repository';
import { buildProfileFromAuthUser } from '@/services/auth.service';

export default function PrivateLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser } = useAuthStore();
  const setData = useAppStore((s) => s.setData);
  const setIsDataReady = useAppStore((s) => s.setIsDataReady);

  useEffect(() => {
    let mounted = true;

    const syncFromSession = async () => {
      if (user) return;

      if (hasSupabase && supabase) {
        const { data } = await supabase.auth.getSession();
        const sessionUser = data.session?.user;
        if (sessionUser && mounted) {
          setUser(await buildProfileFromAuthUser(sessionUser));
          return;
        }
      }

      if (mounted) {
        const redirect = pathname || '/dashboard';
        router.replace(`/login?redirect=${encodeURIComponent(redirect)}`);
      }
    };

    syncFromSession();
    return () => {
      mounted = false;
    };
  }, [user, router, pathname, setUser]);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    console.log('[dashboard] loading juntas start');

    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        console.warn('[dashboard] loading timeout – forcing ready');
        setIsDataReady(true);
      }
    }, 10000);

    fetchUserJuntaSnapshot(user.id)
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          console.error('[dashboard] juntas fetch failed');
          return;
        }
        console.log('[dashboard] memberships loaded', result.data.members.length);
        console.log('[dashboard] schedules loaded', result.data.schedules.length);
        console.log('[dashboard] final juntas', result.data.juntas.length);
        setData({
          juntas: result.data.juntas,
          members: result.data.members,
          schedules: result.data.schedules,
          payments: result.data.payments,
          payouts: result.data.payouts
        });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[dashboard] loading juntas error', err);
      })
      .finally(() => {
        clearTimeout(timeoutId);
        if (!cancelled) {
          console.log('[dashboard] loading juntas end');
          setIsDataReady(true);
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [setData, setIsDataReady, user?.id]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="rounded-lg border bg-white p-6 text-center">
          <p className="text-sm text-slate-600">Redirigiendo a login...</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">Hola, {user.nombre}</p>
        <Button
          variant="outline"
          onClick={async () => {
            try {
              if (hasSupabase && supabase) await supabase.auth.signOut();
            } finally {
              setUser(null);
              setData({ juntas: [], members: [], schedules: [], payments: [], payouts: [], notifications: [] });
              router.replace('/');
            }
          }}
        >
          Cerrar sesión
        </Button>
      </div>
      {children}
    </AppShell>
  );
}
