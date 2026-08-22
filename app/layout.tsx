import './globals.css';
import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { DM_Mono, DM_Sans } from 'next/font/google';
import { ReactNode } from 'react';
import Script from 'next/script';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap'
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'Juntealo',
  description: 'Plataforma para gestionar juntas digitales de ahorro rotativo en Perú',
  icons: {
    icon: [{ url: '/brand/juntealo-icon.svg', type: 'image/svg+xml' }],
    shortcut: ['/brand/juntealo-icon.svg']
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${dmSans.variable} ${dmMono.variable}`}>
      <body>
        {children}
        <Analytics />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-11105388316"
          strategy="afterInteractive"
        />
        <Script id="google-ads-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-11105388316');
          `}
        </Script>
      </body>
    </html>
  );
}
