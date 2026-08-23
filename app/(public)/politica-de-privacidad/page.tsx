import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de privacidad | Juntealo',
  description: 'Política de privacidad y tratamiento de datos personales de la plataforma Juntealo.',
};

const SECTIONS = [
  { id: 'que-datos-recopilamos', title: 'Qué datos recopilamos' },
  { id: 'para-que-usamos-tus-datos', title: 'Para qué usamos tus datos' },
  { id: 'con-quien-compartimos-tus-datos', title: 'Con quién compartimos tus datos' },
  { id: 'tus-derechos-arco', title: 'Tus derechos (ARCO)' },
  { id: 'conservacion-de-datos', title: 'Conservación de datos' },
  { id: 'seguridad', title: 'Seguridad' },
  { id: 'menores-de-edad', title: 'Menores de edad' },
  { id: 'cambios-a-esta-politica', title: 'Cambios a esta política' },
  { id: 'contacto', title: 'Contacto' },
];

export default function PoliticaDePrivacidadPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24 md:py-32">

      {/* Header */}
      <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] md:text-4xl">
        Política de privacidad
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Versión 1.0 &mdash; Última actualización: 23 de agosto de 2026
      </p>

      {/* Table of contents */}
      <nav aria-label="Tabla de contenido" className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
          Contenido
        </h2>
        <ol className="mt-4 space-y-2">
          {SECTIONS.map((section, index) => (
            <li key={section.id} className="flex gap-3 text-sm">
              <span className="w-5 shrink-0 text-right text-[var(--muted)]">
                {index + 1}.
              </span>
              <a
                href={`#${section.id}`}
                className="text-[var(--accent)] underline-offset-2 hover:underline"
              >
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* Divider */}
      <div className="mt-12 border-t border-[var(--border)]" />

      {/* Sections */}
      <div className="mt-12 space-y-12">

        <div id="que-datos-recopilamos" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            1. Qué datos recopilamos
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--text)]">
            Para crear tu cuenta y permitirte participar en juntas, recopilamos: nombre completo,
            número de DNI, número de celular, correo electrónico, y la información que generas al
            usar la plataforma (juntas creadas, aportes reportados, historial de cumplimiento).
          </p>
        </div>

        <div id="para-que-usamos-tus-datos" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            2. Para qué usamos tus datos
          </h2>
          <ul className="mt-3 space-y-2 text-base leading-relaxed text-[var(--text)]">
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--muted)]" />
              <span>Verificar tu identidad y prevenir fraude entre integrantes de una junta.</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--muted)]" />
              <span>Calcular tu Score de confianza.</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--muted)]" />
              <span>Enviarte recordatorios de pago y notificaciones sobre tus juntas.</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--muted)]" />
              <span>Cumplir con obligaciones legales aplicables.</span>
            </li>
          </ul>
          <p className="mt-4 text-base leading-relaxed text-[var(--text)]">
            No usamos tus datos para venderlos a terceros ni para fines de publicidad ajenos a
            Juntealo.
          </p>
        </div>

        <div id="con-quien-compartimos-tus-datos" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            3. Con quién compartimos tus datos
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--text)]">
            Compartimos datos únicamente con proveedores tecnológicos que nos ayudan a operar la
            plataforma (por ejemplo, servicios de hosting y base de datos), bajo obligación
            contractual de confidencialidad. No compartimos tu DNI, celular ni correo con otros
            integrantes de tus juntas sin tu consentimiento explícito para ese fin específico (por
            ejemplo, para coordinar pagos).
          </p>
        </div>

        <div id="tus-derechos-arco" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            4. Tus derechos (ARCO)
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--text)]">
            Puedes solicitar Acceso, Rectificación, Cancelación u Oposición sobre tus datos
            personales en cualquier momento, escribiendo a{' '}
            <a
              href="mailto:soporte@juntealo.com"
              className="text-[var(--accent)] underline-offset-2 hover:underline"
            >
              soporte@juntealo.com
            </a>
            .
          </p>
        </div>

        <div id="conservacion-de-datos" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            5. Conservación de datos
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--text)]">
            Conservamos tus datos mientras mantengas una cuenta activa en Juntealo, y por el plazo
            adicional que exija la normativa aplicable después del cierre de tu cuenta.
          </p>
        </div>

        <div id="seguridad" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            6. Seguridad
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--text)]">
            Aplicamos medidas técnicas y organizativas razonables para proteger tus datos personales
            frente a accesos no autorizados, pérdida o alteración.
          </p>
        </div>

        <div id="menores-de-edad" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            7. Menores de edad
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--text)]">
            Juntealo está dirigido a personas mayores de 18 años. No recopilamos intencionalmente
            datos de menores de edad.
          </p>
        </div>

        <div id="cambios-a-esta-politica" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            8. Cambios a esta política
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--text)]">
            Podemos actualizar esta Política de Privacidad. Publicaremos la fecha de última
            actualización en esta misma página.
          </p>
        </div>

        <div id="contacto" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            9. Contacto
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--text)]">
            Para cualquier consulta sobre el tratamiento de tus datos personales, escríbenos a{' '}
            <a
              href="mailto:soporte@juntealo.com"
              className="text-[var(--accent)] underline-offset-2 hover:underline"
            >
              soporte@juntealo.com
            </a>
            .
          </p>
        </div>

      </div>

      {/* Footer note */}
      <div className="mt-16 border-t border-[var(--border)] pt-6">
        <p className="text-xs text-[var(--muted)]">
          Versión 1.0 &mdash; 23 de agosto de 2026. Juntealo SACS.
        </p>
      </div>

    </section>
  );
}
