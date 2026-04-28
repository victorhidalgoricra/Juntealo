import { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'w-full rounded-[var(--r-sm)] border border-border bg-surface px-3 py-[9px]',
        'text-sm text-fg',
        'outline-none transition-[border-color,box-shadow] duration-150',
        'focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-bg)]',
        props.className
      )}
    />
  );
}
