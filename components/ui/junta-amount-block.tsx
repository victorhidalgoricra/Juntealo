import { cn } from '@/lib/utils';

interface JuntaAmountBlockProps {
  label?: string;
  amount: string;
  sublabel?: string;
  className?: string;
}

export function JuntaAmountBlock({
  label = 'Recibirás en tu turno',
  amount,
  sublabel,
  className,
}: JuntaAmountBlockProps) {
  return (
    <div className={cn('rounded-[var(--r-md)] bg-accent-bg p-4', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-accent">{label}</p>
      <p className="break-words font-mono text-3xl font-bold text-fg">{amount}</p>
      {sublabel && <p className="mt-0.5 text-xs text-muted">{sublabel}</p>}
    </div>
  );
}
