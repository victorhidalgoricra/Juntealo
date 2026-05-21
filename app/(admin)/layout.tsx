'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isBackofficeAdmin } from '@/services/auth-role.service';
import { useAuthStore } from '@/store/auth-store';
import { hasSupabase } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { buildProfileFromAuthUser } from '@/services/auth.service';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser } = useAuthStore();
  const [checkingSession, setCheckingSession] = useState(true);
  const hasBackofficeAccess = isBackofficeAdmin(user);

  useEffect(() => {
    let mounted = true;

    const syncFromSession = async () => {
      if (user) {
        setCheckingSession(false);
        return;
      }

      if (hasSupabase && supabase) {
        const { data } = await supabase.auth.getSession();
        const sessionUser = data.session?.user;
        if (sessionUser && mounted) {
          setUser(await buildProfileFromAuthUser(sessionUser));
          setCheckingSession(false);
          return;
        }
      }

      if (mounted) {
        setCheckingSession(false);
        router.replace(`/login?redirect=${encodeURIComponent(pathname || '/admin')}`);
      }
    };

    syncFromSession();
    return () => {
      mounted = false;
    };
  }, [pathname, router, setUser, user]);

  useEffect(() => {
    if (checkingSession) return;

    if (process.env.NODE_ENV === 'development') {
      console.log('[Backoffice guard]', {
        pathname,
        userId: user?.id ?? null,
        role: user?.global_role ?? null,
        hasBackofficeAccess
      });
    }

    if (user && !hasBackofficeAccess) router.replace('/dashboard');
  }, [checkingSession, hasBackofficeAccess, pathname, router, user]);

  if (checkingSession || !user || !hasBackofficeAccess) return null;

  return <div className="min-h-screen bg-slate-50 p-4 md:p-8">{children}</div>;
}
