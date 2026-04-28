import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Tint = 'green' | 'blue' | 'amber' | 'red';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  tint?: Tint;
  dark?: boolean;
  hover?: boolean;
};

const tints: Record<Tint, string> = {
  green: 'bg-green-bg border-green-200',
  blue:  'bg-accent-bg border-[#c7d7fb]',
  amber: 'bg-amber-bg border-amber-200',
  red:   'bg-destructive-bg border-red-300',
};

export function Card({ className, tint, dark, hover, ...props }: CardProps) {
  return (
    <div
      className={cn(
        dark
          ? 'bg-[var(--dark-2)] rounded-[var(--r-xl)] p-6 shadow-[var(--shadow-xl)]'
          : cn(
              'bg-surface border border-border rounded-[var(--r)] p-4 shadow-[var(--shadow-sm)]',
              tint && tints[tint]
            ),
        hover && 'cursor-pointer transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]',
        className
      )}
      {...props}
    />
  );
}
