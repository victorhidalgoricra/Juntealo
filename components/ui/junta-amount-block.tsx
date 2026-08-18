import { cn } from '@/lib/utils';

interface JuntaAmountBlockProps {
  label?: string;
  amount: string;
  sublabel?: string;
  className?: string;
  /** light: lavender bg, dark text — for use on light surfaces (default).
   *  dark: solid brand-blue bg, white text — for use on dark surfaces (hero). */
  variant?: 'light' | 'dark';
}

export function JuntaAmountBlock({
  label = 'Recibirás en tu turno',
  amount,
  sublabel,
  className,
  variant = 'light',
}: JuntaAmountBlockProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--r-md)] p-4',
        variant === 'light' && 'bg-accent-bg',
        variant === 'dark' && 'bg-accent',
        className,
      )}
    >
      <p
        className={cn(
          'text-[10px] font-semibold uppercase tracking-[0.1em]',
          variant === 'light' && 'text-accent',
          variant === 'dark' && 'text-white/70',
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          'break-words font-mono text-3xl font-bold',
          variant === 'light' && 'text-fg',
          variant === 'dark' && 'text-white',
        )}
      >
        {amount}
      </p>
      {sublabel && (
        <p
          className={cn(
            'mt-0.5 text-xs',
            variant === 'light' && 'text-muted',
            variant === 'dark' && 'text-white/60',
          )}
        >
          {sublabel}
        </p>
      )}
    </div>
  );
}
