import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'outline' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const variants: Record<Variant, string> = {
  default:     'bg-accent text-white hover:bg-accent-dark',
  outline:     'border border-border bg-surface text-fg hover:bg-accent-bg hover:border-accent',
  ghost:       'bg-transparent text-fg hover:bg-slate-100',
  destructive: 'bg-destructive text-white hover:opacity-90',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md gap-1',
  md: 'px-[18px] py-[9px] text-sm rounded-[var(--r-sm)] gap-1.5',
  lg: 'px-6 py-3 text-[15px] rounded-[var(--r-sm)] gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'default', size = 'md', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center font-semibold whitespace-nowrap',
        'transition-[background,opacity,transform] duration-150',
        'active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
});
