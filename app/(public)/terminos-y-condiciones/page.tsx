import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Términos y condiciones | Juntealo',
  description: 'Términos y condiciones de uso de la plataforma Juntealo.',
};

const SECTIONS = [
  { id: 'que-es-juntealo', title: 'Qué es Juntealo' },
  { id: 'que-no-es-juntealo', title: 'Qué no es Juntealo' },
  { id: 'cuentas-y-registro', title: 'Cuentas y registro' },
  { id: 'como-funcionan-las-juntas', title: 'Cómo funcionan las juntas' },
  { id: 'pagos-entre-integrantes', title: 'Pagos entre integrantes' },
  { id: 'score-de-confianza', title: 'Score de confianza' },
  { id: 'programa-de-embajadores', title: 'Programa de embajadores' },
  { id: 'responsabilidades-del-usuario', title: 'Responsabilidades del usuario' },
  { id: 'limitacion-de-responsabilidad', title: 'Limitación de responsabilidad' },
  { id: 'proteccion-de-datos-personales', title: 'Protección de datos personales' },
  { id: 'modificaciones', title: 'Modificaciones a estos términos' },
  { id: 'contacto', title: 'Contacto' },
];

export default function TerminosYCondicionesPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24 md:py-32">

      {/* Header */}
      <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] md:text-4xl">
        Términos y condiciones
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

        <div id="que-es-juntealo" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            1. Qué es Juntealo
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--text)]">
            Juntealo es una plataforma digital operada por Juntealo SACS que permite a un grupo
            de personas (&ldquo;integrantes&rdquo;) organizar y dar seguimiento a una junta de
            ahorro rotativa (también conocida como &ldquo;pandero&rdquo; o &ldquo;quiniela de
            ahorro&rdquo;). Juntealo registra la información de la junta, envía recordatorios de
            pago, hace seguimiento del estado de los aportes y turnos, y calcula indicadores de
            cumplimiento como el Score de confianza. El uso de la plataforma implica la aceptación
            de estos Términos y Condiciones.
          </p>
        </div>

        <div id="que-no-es-juntealo" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            2. Qué no es Juntealo
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--text)]">
            Juntealo no es una entidad financiera, no está supervisada por la Superintendencia de
            Banca, Seguros y AFP (SBS), no capta depósitos del público, no otorga créditos, y no
            procesa, custodia ni administra el dinero de los integrantes en ningún momento. Los
            aportes y los cobros de cada turno se realizan de forma directa entre los integrantes
            de la junta, mediante Yape, Plin, transferencia bancaria u otro medio que el grupo
            acuerde. Juntealo únicamente registra que un pago fue reportado como realizado; no
            verifica ni garantiza que el dinero haya cambiado de manos de forma efectiva.
          </p>
        </div>

        <div id="cuentas-y-registro" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            3. Cuentas y registro
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--text)]">
            Para usar Juntealo, el usuario debe crear una cuenta y proporcionar información veraz,
            incluyendo nombre completo, número de celular y/o correo electrónico. El usuario es
            responsable de mantener la confidencialidad de sus credenciales de acceso y de toda
            actividad realizada desde su cuenta. Juntealo se reserva el derecho de suspender o
            eliminar cuentas que proporcionen información falsa, suplanten la identidad de
            terceros, o que se utilicen para fines distintos a los previstos en estos Términos.
            El uso de la plataforma está dirigido a personas mayores de 18 años.
          </p>
        </div>

        <div id="como-funcionan-las-juntas" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            4. Cómo funcionan las juntas
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--text)]">
            Un integrante puede crear una junta pública o privada, definiendo el número de
            personas, el monto de la cuota, la frecuencia de aporte (semanal, quincenal o mensual)
            y el orden de turnos. Al unirse a una junta, cada integrante se compromete frente al
            resto del grupo &mdash;no frente a Juntealo&mdash; a realizar sus aportes en los
            plazos acordados. Juntealo no participa como parte del acuerdo entre integrantes ni
            asume obligación de pago alguna.
          </p>
        </div>

        <div id="pagos-entre-integrantes" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            5. Pagos entre integrantes
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--text)]">
            Todo pago realizado entre integrantes se efectúa por fuera de la plataforma, mediante
            los canales que el propio grupo decida. Juntealo no interviene en la transferencia de
            fondos, no tiene acceso a las cuentas bancarias o billeteras digitales de los
            usuarios, y no puede revertir, retener ni garantizar ningún pago. El registro de
            &ldquo;pago confirmado&rdquo; dentro de la plataforma refleja únicamente lo reportado
            por los propios integrantes.
          </p>
        </div>

        <div id="score-de-confianza" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            6. Score de confianza
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--text)]">
            Juntealo calcula un Score de confianza para cada usuario, basado en su historial de
            puntualidad y cumplimiento dentro de las juntas en las que ha participado. Este puntaje
            es referencial y tiene como único propósito ayudar a los organizadores de juntas
            públicas a tomar decisiones informadas sobre nuevos integrantes. El Score de confianza
            no constituye una calificación crediticia ni tiene ningún efecto legal o financiero
            fuera de la plataforma.
          </p>
        </div>

        <div id="programa-de-embajadores" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            7. Programa de embajadores
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--text)]">
            Los usuarios que participen del programa de embajadores podrán crear juntas, invitar a
            su comunidad y acceder a los beneficios descritos en la sección correspondiente del
            sitio. La participación en el programa está sujeta a los términos específicos que
            Juntealo comunique para dicho programa, los cuales se consideran parte integrante de
            este documento.
          </p>
        </div>

        <div id="responsabilidades-del-usuario" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            8. Responsabilidades del usuario
          </h2>
          <ul className="mt-3 space-y-2 text-base leading-relaxed text-[var(--text)]">
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--muted)]" />
              <span>
                Proporcionar información veraz al registrarse y al crear o unirse a una junta.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--muted)]" />
              <span>
                Realizar los aportes acordados con el grupo, en los plazos y por los medios
                definidos.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--muted)]" />
              <span>
                No utilizar la plataforma para fines fraudulentos, ilícitos o ajenos al propósito
                de una junta de ahorro.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--muted)]" />
              <span>
                Resolver directamente con los demás integrantes cualquier disputa relacionada con
                incumplimiento de pagos, sin que ello genere responsabilidad para Juntealo.
              </span>
            </li>
          </ul>
        </div>

        <div id="limitacion-de-responsabilidad" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            9. Limitación de responsabilidad
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--text)]">
            Juntealo actúa exclusivamente como una herramienta de registro, organización y
            seguimiento entre personas que deciden libremente formar una junta de ahorro. Juntealo
            no garantiza el cumplimiento de pago de ningún integrante, no es responsable por
            pérdidas económicas derivadas del incumplimiento de otros integrantes, y no participa
            en la relación económica que se genera entre los miembros de una junta. El uso de la
            plataforma es bajo el propio riesgo del usuario en lo relativo a la confianza
            depositada en los demás integrantes del grupo.
          </p>
        </div>

        <div id="proteccion-de-datos-personales" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            10. Protección de datos personales
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--text)]">
            Los datos personales proporcionados por el usuario serán tratados conforme a la Ley
            N° 29733, Ley de Protección de Datos Personales, y su reglamento. Los datos se
            utilizan para la operación de la plataforma, el cálculo del Score de confianza, el
            envío de comunicaciones relacionadas con el servicio, y el cumplimiento de obligaciones
            legales aplicables. El usuario puede ejercer sus derechos de acceso, rectificación,
            cancelación y oposición (derechos ARCO) escribiendo a{' '}
            <a
              href="mailto:soporte@juntealo.com"
              className="text-[var(--accent)] underline-offset-2 hover:underline"
            >
              soporte@juntealo.com
            </a>
            .{' '}
            <a
              href="/politica-de-privacidad"
              className="text-[var(--accent)] underline-offset-2 hover:underline"
            >
              Consulta nuestra Política de privacidad completa aquí.
            </a>
          </p>
        </div>

        <div id="modificaciones" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            11. Modificaciones a estos términos
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--text)]">
            Juntealo podrá modificar estos Términos y Condiciones en cualquier momento. Los cambios
            entrarán en vigencia desde su publicación en el sitio, indicando la fecha de última
            actualización. El uso continuado de la plataforma después de una modificación implica
            la aceptación de los nuevos términos.
          </p>
        </div>

        <div id="contacto" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            12. Contacto
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--text)]">
            Para consultas relacionadas con estos Términos y Condiciones, el usuario puede escribir
            a{' '}
            <a
              href="mailto:soporte@juntealo.com"
              className="text-[var(--accent)] underline-offset-2 hover:underline"
            >
              soporte@juntealo.com
            </a>{' '}
            o a través de los canales de soporte listados en el pie de página del sitio.
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
