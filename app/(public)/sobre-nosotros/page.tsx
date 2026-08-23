import type { Metadata } from 'next';
import { Shield, Eye, BadgeCheck, TrendingUp, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sobre nosotros | Juntealo',
  description: 'Conoce la historia y el propósito detrás de Juntealo.',
};

const HOW_ITEMS = [
  {
    Icon: Shield,
    text: 'Nunca tocamos tu dinero. Los pagos van directo entre integrantes.',
  },
  {
    Icon: Eye,
    text: 'Transparencia total: sabes exactamente qué aportas, cuándo, y qué recibes.',
  },
  {
    Icon: BadgeCheck,
    text: 'Sin cargos ocultos ni intereses. Juntealo no es un prestamista.',
  },
  {
    Icon: TrendingUp,
    text: 'Un Score de confianza que se construye con tu propio cumplimiento, no con tu historial bancario.',
  },
] as const;

export default function SobreNosotrosPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24 md:py-32">

      {/* Header */}
      <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] md:text-4xl">
        Sobre nosotros
      </h1>

      {/* Opening — sin subtítulo de sección */}
      <p className="mt-6 text-base leading-relaxed text-[var(--text)]">
        No creamos Juntealo desde una oficina pensando en una oportunidad de mercado. La creamos
        porque lo vivimos: la sensación de necesitar dinero y no tener a dónde ir. Ningún banco te
        presta cuando más lo necesitas, y las alternativas informales cobran un precio que muchas
        veces no se mide solo en soles.
      </p>

      <div className="mt-12 border-t border-[var(--border)]" />

      {/* Sections */}
      <div className="mt-12 space-y-12">

        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">
            El problema que no queríamos ignorar
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--text)]">
            En el Perú, cuando alguien de a pie necesita dinero rápido para su negocio, su familia
            o una emergencia, casi siempre le quedan dos caminos: que un banco lo rechace por no
            tener historial, o recurrir a un prestamista informal. Ahí empieza el &ldquo;gota a
            gota&rdquo;: tasas que superan el 20% mensual, cobradores que no negocian, y en los
            casos más graves, amenazas y extorsión a quien no puede pagar a tiempo. Es un sistema
            que castiga la necesidad en vez de resolverla.
          </p>
          <p className="mt-3 text-base leading-relaxed text-[var(--text)]">
            Mientras tanto, existe una herramienta que millones de peruanos ya usan hace
            generaciones para resolver exactamente este problema: la junta. El pandero, la quiniela
            de ahorro, el fondo entre amigos del trabajo. Funciona, pero corre en cuadernos y
            grupos de WhatsApp, sin estructura, sin recordatorios, sin forma de saber si puedes
            confiar en alguien que no conoces.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Por qué existe Juntealo
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--text)]">
            No inventamos la junta. La dignificamos. Le dimos la estructura que le faltaba para
            que cualquiera pueda organizarla con su gente de confianza, o encontrar una junta
            pública con personas que también quieren cumplir. Sin tasas de interés, sin cobradores,
            sin letra chica.
          </p>
          <p className="mt-3 text-base leading-relaxed text-[var(--text)]">
            Y lo decimos sin rodeos: no somos una de esas apps que te enganchan con una promesa
            gratuita y después no dejan de cobrarte. Juntealo no vive de exprimir a quien ya tiene
            poco. Vivimos de que la junta funcione, y de que quien la usa vuelva porque le sirvió,
            no porque no puede salir.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Nuestra historia
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--text)]">
            Quienes hicimos Juntealo lo vivimos en carne propia: la falta de dinero, y sobre todo,
            la falta de acceso a las herramientas que otros dan por sentado. Sabemos lo que es no
            tener con qué empezar. Por eso construimos esto para la persona de a pie con ganas de
            emprender &mdash; no para quien ya tiene todas las puertas abiertas.
          </p>
        </div>

        {/* Eyebrow badge destacado + sección 100% peruana */}
        <div>
          <p className="inline-flex items-center rounded-full bg-[var(--green-bg)] px-3 py-1 text-xs font-semibold text-[var(--green)]">
            ● 100% peruana
          </p>
          <h2 className="mt-3 text-lg font-semibold text-[var(--text)]">
            Una empresa con raíces peruanas
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--text)]">
            Juntealo es una empresa 100% peruana. Entendemos la realidad de un mercado que otros
            modelos importados no entienden: cómo paga la gente (Yape, Plin, efectivo), cómo
            confía la gente, y por qué la junta ya es parte de nuestra cultura financiera, mucho
            antes de que existiera una app para ella.
          </p>
        </div>

        {/* Lista con ícono */}
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Cómo lo hacemos
          </h2>
          <ul className="mt-5 space-y-4">
            {HOW_ITEMS.map(({ Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <span
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-[var(--accent-bg)]"
                  aria-hidden="true"
                >
                  <Icon size={16} className="text-[var(--accent)]" />
                </span>
                <span className="pt-1.5 text-[15px] font-medium leading-relaxed text-[var(--text)]">
                  {text}
                </span>
              </li>
            ))}
          </ul>
        </div>

      </div>

      {/* Cierre + CTA */}
      <div className="mt-16 border-t border-[var(--border)] pt-10">
        <p className="text-base leading-relaxed text-[var(--text)]">
          Si alguna vez te tocó la puerta equivocada pidiendo un préstamo, sabemos exactamente de
          qué hablamos. Juntealo es la puerta que debió haber existido desde el principio.
        </p>
        <div className="mt-6">
          <a
            href="/explorar"
            className="inline-flex items-center gap-2 rounded-[var(--r-sm)] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
          >
            Explorar juntas
            <ArrowRight size={14} aria-hidden="true" />
          </a>
        </div>
      </div>

    </section>
  );
}
