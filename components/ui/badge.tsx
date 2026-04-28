import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant =
  | 'pendiente' | 'pagada' | 'vencida' | 'moroso'
  | 'activo' | 'invitado' | 'publica' | 'privada'
  | 'green' | 'amber' | 'dark';

const variantStyles: Record<BadgeVariant, string> = {
  pendiente: 'bg-amber-bg text-[#92400e]',
  pagada:    'bg-green-bg text-[#065f46]',
  vencida:   'bg-destructive-bg text-[#991b1b]',
  moroso:    'bg-destructive-bg text-[#991b1b]',
  activo:    'bg-accent-bg text-accent-dark',
  invitado:  'bg-slate-100 text-slate-600',
  publica:   'bg-accent-bg text-accent',
  privada:   'bg-slate-100 text-slate-600',
  green:     'bg-green-bg text-[#065f46]',
  amber:     'bg-amber-bg text-[#92400e]',
  dark:      'bg-emerald-500/15 text-emerald-400',
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({ className, children, variant, ...props }: BadgeProps) {
  const contentKey = String(children).toLowerCase() as BadgeVariant;
  const resolved = variant ?? (variantStyles[contentKey] ? contentKey : undefined);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-[10px] py-[3px] text-[11px] font-semibold leading-none',
        resolved ? variantStyles[resolved] : 'bg-slate-100 text-slate-600',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
