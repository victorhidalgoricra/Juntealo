'use client';

import Link from 'next/link';
import { ReactNode, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { isBackofficeAdmin } from '@/services/auth-role.service';

type NavItem = {
  href: string;
  label: string;
  requiresBackoffice?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',  label: 'Dashboard' },
  { href: '/juntas',     label: 'Juntas disponibles' },
  { href: '/juntas/new', label: 'Crear junta' },
  { href: '/account',    label: 'Mi cuenta' },
  { href: '/admin',      label: 'Backoffice', requiresBackoffice: true },
];

function getInitials(nombre: string, email: string) {
  const source = nombre.trim() || (email.split('@')[0] ?? '');
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'JD';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const canAccessBackoffice = isBackofficeAdmin(user);

  const isAccountSection =
    pathname.startsWith('/account') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/notifications');

  const links = useMemo(
    () => NAV_ITEMS.filter((item) => !item.requiresBackoffice || canAccessBackoffice),
    [canAccessBackoffice]
  );

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      {/* Sidebar */}
      <aside className="flex flex-col border-b border-border bg-surface px-3 py-5 md:min-h-screen md:border-b-0 md:border-r">
        {/* Brand */}
        <p className="mb-6 px-2 text-[17px] font-bold text-accent">Juntas Digitales</p>

        {process.env.NODE_ENV === 'development' && (
          <p className="mb-2 px-2 text-[11px] text-muted">Rol: {user?.global_role ?? 'user'}</p>
        )}

        {/* Nav items */}
        <nav className="flex gap-1 overflow-auto md:flex-col">
          {links.map((link) => {
            const active =
              pathname === link.href ||
              (link.href === '/account' && isAccountSection) ||
              (link.href === '/admin' && pathname.startsWith('/admin'));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-[var(--r-sm)] px-3 py-[9px] text-sm transition-colors duration-150',
                  active
                    ? 'bg-[var(--dark-1)] font-semibold text-white'
                    : 'font-medium bg-slate-100 text-slate-600 hover:bg-accent-bg hover:text-accent'
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        {user && (
          <div className="mt-auto border-t border-border pt-4">
            <div className="flex items-center gap-2.5 px-2">
              <div className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent-bg text-[13px] font-bold text-accent">
                {getInitials(user.nombre, user.email)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-fg">
                  {user.nombre.trim() || user.email.split('@')[0]}
                </p>
                <p className="text-[11px] text-muted">Mi cuenta</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="p-4 md:p-7">{children}</main>
    </div>
  );
}
