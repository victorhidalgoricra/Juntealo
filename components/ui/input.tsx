import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-[var(--r-sm)] border border-border bg-surface px-3 py-[9px]',
        'text-sm text-fg placeholder:text-faint',
        'outline-none transition-[border-color,box-shadow] duration-150',
        'focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-bg)]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  );
});
