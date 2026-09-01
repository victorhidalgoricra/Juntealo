'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useAppStore } from '@/store/app-store';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { hasSupabase } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { fetchUserJuntaSnapshot } from '@/services/juntas.repository';
import { buildProfileFromAuthUser } from '@/services/auth.service';

function getDisplayName(nombre?: string, email?: string) {
  const fromNombre = (nombre ?? '').trim();
  if (fromNombre) return fromNombre;
  const fromEmail = (email ?? '').split('@')[0]?.replace(/[._-]+/g, ' ').trim();
  if (fromEmail) return fromEmail.replace(/\b\w/g, (char) => char.toUpperCase());
  return 'Miembro';
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'JD';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function PrivateLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser } = useAuthStore();
  const setData = useAppStore((s) => s.setData);
  const setIsDataReady = useAppStore((s) => s.setIsDataReady);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let mounted = true;

    const syncFromSession = async () => {
      if (hasSupabase && supabase) {
        const { data } = await supabase.auth.getSession();
        const sessionUser = data.session?.user;
        if (sessionUser && mounted) {
          if (user?.id !== sessionUser.id) {
            setUser(await buildProfileFromAuthUser(sessionUser));
          }
          setSessionChecked(true);
          return;
        }

        if (mounted) {
          setUser(null);
          setData({ juntas: [], members: [], schedules: [], payments: [], payouts: [], notifications: [] });
        }
      } else if (user && mounted) {
        setSessionChecked(true);
        return;
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
  }, [user, router, pathname, setUser, setData]);

  useEffect(() => {
    if (!sessionChecked || !user?.id) return;

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
  }, [sessionChecked, setData, setIsDataReady, user?.id]);

  if (!sessionChecked || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="rounded-lg border bg-white p-6 text-center">
          <p className="text-sm text-slate-600">Redirigiendo a login...</p>
        </div>
      </div>
    );
  }

  const displayName = getDisplayName(user.nombre, user.email);
  const isDashboard = pathname === '/dashboard';

  return (
    <AppShell>
      <div className={`mx-auto mb-4 flex max-w-6xl items-center justify-between gap-3 px-6 ${isDashboard ? 'lg:mb-3 lg:min-h-0' : ''}`}>
        <div className="flex min-w-0 items-center gap-2.5">
          <div className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white ${isDashboard ? 'lg:h-7 lg:w-7' : ''}`}>
            {getInitials(displayName)}
          </div>
          <p className="truncate text-sm font-medium text-fg">Buenos días, {displayName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/account?tab=notifications" aria-label="Ir a notificaciones" className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-fg ${isDashboard ? 'lg:h-7 lg:w-7' : ''}`}>
            <Bell size={15} strokeWidth={1.8} />
          </Link>
          <Button
            variant="outline"
            className={isDashboard ? 'lg:h-8 lg:px-3' : undefined}
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
      </div>
      {children}
    </AppShell>
  );
}
