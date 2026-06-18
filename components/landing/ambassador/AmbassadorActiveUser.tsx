import { RevealOnScroll } from '@/components/landing/reveal';

export function AmbassadorActiveUser() {
  return (
    <RevealOnScroll className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <div className="rounded-[var(--r)] border border-[var(--border)] bg-[var(--accent-bg)] p-6 md:p-8">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--text)]">
          ¿Qué consideramos un usuario activo?
        </h2>
        <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-[var(--text)]">
          Es una persona referida por el embajador que completa su registro y utiliza Juntealo de
          acuerdo con las condiciones vigentes del programa.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
          Los criterios específicos, la vigencia y la forma de entrega de los beneficios serán
          informados durante la sesión de presentación y en los términos del programa.
        </p>
      </div>
    </RevealOnScroll>
  );
}
