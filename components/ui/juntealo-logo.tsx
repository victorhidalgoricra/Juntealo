import Image from 'next/image';
import Link from 'next/link';

type Props = {
  size?: 'sm' | 'md';
  href?: string;
  variant?: 'default' | 'white';
};

const sizes = {
  sm: { icon: 26, text: 15 },
  md: { icon: 32, text: 18 },
};

function LogoContent({ size = 'md', variant = 'default' }: Pick<Props, 'size' | 'variant'>) {
  const { icon, text } = sizes[size ?? 'md'];
  return (
    <span className="inline-flex items-center gap-2 select-none">
      <Image
        src="/brand/juntealo-icon.svg"
        alt=""
        width={icon}
        height={icon}
        className="shrink-0"
        aria-hidden
      />
      <span
        className={`font-bold tracking-[-0.03em] ${variant === 'white' ? 'text-white' : 'text-[var(--accent)]'}`}
        style={{ fontSize: text }}
      >
        juntealo
      </span>
    </span>
  );
}

export function JuntealoLogo({ size = 'md', href = '/', variant = 'default' }: Props) {
  return (
    <Link href={href} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded">
      <LogoContent size={size} variant={variant} />
    </Link>
  );
}
