import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function DarkHeroCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative rounded-[var(--r-xl)] bg-[var(--dark-1)] p-5 text-white shadow-xl sm:p-7',
        className,
      )}
      {...props}
    />
  );
}
