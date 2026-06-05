'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { JuntealoLogo } from '@/components/ui/juntealo-logo';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/', label: 'Inicio' },
  { href: '/como-funciona', label: '¿Cómo funciona?' },
  { href: '/beneficios', label: 'Beneficios' },
  { href: '/explorar', label: 'Explorar juntas' },
];

export function LandingNavbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-[100] bg-[var(--surface)] transition-all duration-200',
          scrolled
            ? 'border-b border-[var(--border)] shadow-[0_1px_12px_0_rgb(0_0_0/0.07)]'
            : 'border-b border-transparent shadow-none'
        )}
      >
        <div className="mx-auto flex h-[60px] w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-10">
          <JuntealoLogo size="md" />

          {/* Desktop nav */}
          <nav className="hidden items-center gap-0.5 text-sm font-medium text-[var(--text)] md:flex">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'relative rounded-[var(--r-sm)] px-3 py-2 transition-colors',
                    isActive
                      ? 'text-[var(--accent)] font-semibold'
                      : 'hover:bg-[var(--accent-bg)] hover:text-[var(--accent)]'
                  )}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-1 left-3 right-3 h-[2px] rounded-full bg-[var(--accent)]" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden items-center gap-2 md:flex">
            <Link
              href="/login"
              className="rounded-[var(--r-sm)] px-4 py-2 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--accent-bg)] hover:text-[var(--accent)]"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center rounded-[var(--r-sm)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-dark)] active:scale-[0.97]"
            >
              Registrarme
            </Link>
          </div>

          {/* Mobile: CTA + hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <Link
              href="/register"
              className="inline-flex rounded-[var(--r-sm)] bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-dark)]"
            >
              Registrarme
            </Link>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={open}
              className="flex h-9 w-9 items-center justify-center rounded-[var(--r-sm)] text-[var(--text)] transition hover:bg-[var(--accent-bg)]"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[99] bg-black/30 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed left-0 right-0 top-[60px] z-[100] border-b border-[var(--border)] bg-[var(--surface)] shadow-lg transition-all duration-200 ease-out md:hidden',
          open ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0 pointer-events-none'
        )}
      >
        <nav className="mx-auto max-w-7xl px-4 py-3">
          <ul className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'block rounded-[var(--r-sm)] px-4 py-3 text-[15px] font-medium transition-colors',
                    pathname === link.href
                      ? 'bg-[var(--accent-bg)] text-[var(--accent)] font-semibold'
                      : 'text-[var(--text)] hover:bg-[var(--accent-bg)] hover:text-[var(--accent)]'
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-3 border-t border-[var(--border)] pt-3 pb-2">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="block rounded-[var(--r-sm)] px-4 py-3 text-[15px] font-medium text-[var(--text)] transition-colors hover:bg-[var(--accent-bg)] hover:text-[var(--accent)]"
            >
              Iniciar sesión
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}
