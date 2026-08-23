import { ReactNode } from 'react';
import { LandingNavbar } from '@/components/landing/landing-navbar';
import { LandingFooter } from '@/components/landing/landing-footer';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <LandingNavbar />
      <main>{children}</main>
      <LandingFooter />
    </div>
  );
}
