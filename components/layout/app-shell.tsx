'use client';

import Link from 'next/link';
import { ReactNode, useMemo, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X, LogOut, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { isBackofficeAdmin } from '@/services/auth-role.service';
import { JuntealoLogo } from '@/components/ui/juntealo-logo';

type NavItem = {
  href: string;
  label: string;
  requiresBackoffice?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',  label: 'Dashboard' },
  { href: '/juntas',     label: 'Juntas disponibles' },
  { href: '/juntas/new', label: 'Crear junta' },
  { href: '/ranking',    label: 'Ranking' },
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
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAccountSection =
    pathname.startsWith('/account') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/notifications');

  const links = useMemo(
    () => NAV_ITEMS.filter((item) => !item.requiresBackoffice || canAccessBackoffice),
    [canAccessBackoffice]
  );

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  function isActive(link: NavItem) {
    return (
      pathname === link.href ||
      (link.href === '/account' && isAccountSection) ||
      (link.href === '/admin' && pathname.startsWith('/admin'))
    );
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">

      {/* ── Mobile top bar ── */}
      <div className="sticky top-0 z-[100] flex h-[56px] items-center justify-between border-b border-border bg-surface px-4 md:hidden">
        <JuntealoLogo size="sm" />
        <button
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={mobileOpen}
          className="flex h-9 w-9 items-center justify-center rounded-[var(--r-sm)] text-[var(--text)] transition hover:bg-[var(--accent-bg)]"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ── Mobile menu overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[99] bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* ── Mobile drawer ── */}
      <div
        className={cn(
          'fixed left-0 right-0 top-[56px] z-[100] border-b border-border bg-surface shadow-xl transition-all duration-200 ease-out md:hidden',
          mobileOpen ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0 pointer-events-none'
        )}
      >
        {process.env.NODE_ENV === 'development' && (
          <p className="px-5 pt-3 text-[11px] text-muted">Rol: {user?.global_role ?? 'user'}</p>
        )}
        <nav className="px-3 py-3">
          <ul className="flex flex-col gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'block rounded-[var(--r-sm)] px-4 py-3 text-[15px] font-medium transition-colors',
                    isActive(link)
                      ? 'bg-[var(--dark-1)] font-semibold text-white'
                      : 'text-[var(--text)] hover:bg-[var(--accent-bg)] hover:text-[var(--accent)]'
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User info in drawer */}
        {user && (
          <div className="border-t border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent-bg text-[13px] font-bold text-accent">
                {getInitials(user.nombre, user.email)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-fg">
                  {user.nombre.trim() || user.email.split('@')[0]}
                </p>
                <p className="text-[11px] text-muted">{user.email}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden flex-col border-r border-border bg-surface px-3 py-5 md:flex md:min-h-screen">
        {/* Brand */}
        <div className="mb-6 px-2">
          <JuntealoLogo size="sm" />
        </div>

        {process.env.NODE_ENV === 'development' && (
          <p className="mb-2 px-2 text-[11px] text-muted">Rol: {user?.global_role ?? 'user'}</p>
        )}

        {/* Nav items */}
        <nav className="flex flex-col gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-[var(--r-sm)] px-3 py-[9px] text-sm transition-colors duration-150',
                isActive(link)
                  ? 'bg-[var(--dark-1)] font-semibold text-white'
                  : 'font-medium bg-slate-100 text-slate-600 hover:bg-accent-bg hover:text-accent'
              )}
            >
              {link.href === '/ranking' ? (
                <>
                  {link.label}
                  <Trophy
                    className="ml-1 inline-block align-[-2px] text-amber"
                    size={16}
                    strokeWidth={2}
                    aria-hidden
                  />
                </>
              ) : (
                link.label
              )}
            </Link>
          ))}
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
      <main className="min-w-0 p-4 md:p-7">{children}</main>
    </div>
  );
}
