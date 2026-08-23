import Link from 'next/link';
import { JuntealoLogo } from '@/components/ui/juntealo-logo';

const productLinks = [
  { href: '/', label: 'Inicio' },
  { href: '/como-funciona', label: '¿Cómo funciona?' },
  { href: '/beneficios', label: 'Beneficios' },
  { href: '/explorar', label: 'Explorar juntas' },
];

const companyLinks = [
  { href: '/sobre-nosotros', label: 'Sobre nosotros' },
  { href: '/embajador', label: 'Embajador' },
  { href: '/terminos-y-condiciones', label: 'Términos y condiciones' },
  { href: '/politica-de-privacidad', label: 'Política de privacidad' },
];

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
    </svg>
  );
}

export function LandingFooter() {
  return (
    <footer className="bg-[var(--dark-1)] text-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Marca */}
          <div className="flex flex-col gap-4">
            <JuntealoLogo variant="white" />
            <p className="max-w-[220px] text-sm leading-relaxed text-[var(--dark-muted)]">
              Ahorra en comunidad, sin bancos ni complicaciones.
            </p>
            <div className="flex items-center gap-2">
              <a
                href="https://www.instagram.com/juntealo"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram de Juntealo"
                className="flex h-8 w-8 items-center justify-center rounded-[var(--r-sm)] text-[var(--dark-muted)] transition-colors hover:bg-[var(--dark-4)] hover:text-white"
              >
                <InstagramIcon />
              </a>
              <a
                href="https://www.tiktok.com/@juntealo"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok de Juntealo"
                className="flex h-8 w-8 items-center justify-center rounded-[var(--r-sm)] text-[var(--dark-muted)] transition-colors hover:bg-[var(--dark-4)] hover:text-white"
              >
                <TikTokIcon />
              </a>
            </div>
          </div>

          {/* Producto */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-white">Producto</h3>
            <ul className="flex flex-col gap-2.5">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--dark-muted)] transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Empresa */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-white">Empresa</h3>
            <ul className="flex flex-col gap-2.5">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--dark-muted)] transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contáctanos */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-white">Contáctanos</h3>
            <ul className="flex flex-col gap-2.5">
              <li>
                <a
                  href="mailto:soporte@juntealo.com"
                  className="text-sm text-[var(--dark-muted)] transition-colors hover:text-white"
                >
                  soporte@juntealo.com
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/51962019181?text=Hola%2C%20tengo%20una%20consulta%20sobre%20Juntealo."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--dark-muted)] transition-colors hover:text-white"
                >
                  Escríbenos por WhatsApp
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-[var(--dark-4)] pt-8 text-sm text-[var(--dark-muted)] sm:flex-row sm:items-center sm:justify-between">
          <span>Juntealo SACS © 2026. Todos los derechos reservados.</span>
          <span>Lima, Perú</span>
        </div>
      </div>
    </footer>
  );
}
