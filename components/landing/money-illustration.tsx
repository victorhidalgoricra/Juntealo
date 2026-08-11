export function MoneyIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      {/* soft background */}
      <ellipse cx="46" cy="62" rx="38" ry="26" fill="var(--accent-bg)" />

      {/* arms — rendered before body so body sits on top */}
      <path d="M32 56 Q20 48 16 36" stroke="var(--accent-dark)" strokeWidth="8" strokeLinecap="round" />
      <path d="M62 56 Q74 48 76 36" stroke="var(--accent-dark)" strokeWidth="8" strokeLinecap="round" />

      {/* body */}
      <rect x="28" y="52" width="36" height="28" rx="12" fill="var(--accent)" />

      {/* head */}
      <circle cx="46" cy="37" r="15" fill="var(--accent)" />

      {/* eyes */}
      <circle cx="41" cy="35" r="2" fill="white" />
      <circle cx="51" cy="35" r="2" fill="white" />

      {/* smile */}
      <path d="M40 41 Q46 47 52 41" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* coin outer ring */}
      <circle cx="78" cy="20" r="14" fill="white" stroke="var(--accent)" strokeWidth="2" />
      {/* coin inner fill */}
      <circle cx="78" cy="20" r="10" fill="var(--accent-bg)" />
      {/* abstract money lines inside coin */}
      <line x1="71" y1="18" x2="85" y2="18" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="73" y1="22" x2="83" y2="22" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" />

      {/* sparkle dots */}
      <circle cx="63" cy="9"  r="2.5" fill="var(--accent-light)" />
      <circle cx="90" cy="12" r="2"   fill="var(--accent)" opacity="0.5" />
      <circle cx="91" cy="30" r="2.5" fill="var(--accent-light)" opacity="0.7" />
    </svg>
  );
}
