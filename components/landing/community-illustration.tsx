export function CommunityIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      {/* soft background */}
      <ellipse cx="48" cy="60" rx="38" ry="28" fill="var(--accent-bg)" />

      {/* dashed lines — drawn first so figures appear on top */}
      <line x1="48" y1="42" x2="16" y2="16" stroke="var(--accent-light)" strokeWidth="1.5" strokeDasharray="3 2.5" />
      <line x1="48" y1="42" x2="80" y2="16" stroke="var(--accent-light)" strokeWidth="1.5" strokeDasharray="3 2.5" />

      {/* satellite — top left */}
      <circle cx="16" cy="14" r="9" fill="var(--accent-light)" />
      <circle cx="13.5" cy="12.5" r="1.3" fill="white" />
      <circle cx="18.5" cy="12.5" r="1.3" fill="white" />
      <path d="M13 17 Q16 20 19 17" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <rect x="10" y="22" width="12" height="8" rx="4" fill="var(--accent-light)" />

      {/* satellite — top right */}
      <circle cx="80" cy="14" r="9" fill="var(--accent-light)" />
      <circle cx="77.5" cy="12.5" r="1.3" fill="white" />
      <circle cx="82.5" cy="12.5" r="1.3" fill="white" />
      <path d="M77 17 Q80 20 83 17" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <rect x="74" y="22" width="12" height="8" rx="4" fill="var(--accent-light)" />

      {/* center person arms — behind body */}
      <path d="M34 58 Q22 50 20 42" stroke="var(--accent-dark)" strokeWidth="7" strokeLinecap="round" />
      <path d="M62 58 Q74 50 76 42" stroke="var(--accent-dark)" strokeWidth="7" strokeLinecap="round" />

      {/* center person body */}
      <rect x="30" y="56" width="36" height="26" rx="12" fill="var(--accent)" />

      {/* center person head */}
      <circle cx="48" cy="42" r="14" fill="var(--accent)" />

      {/* crown — rendered after head so it sits on top */}
      <path d="M38 28 L38 20 L43 24 L48 16 L53 24 L58 20 L58 28 Z" fill="var(--accent-light)" />

      {/* eyes */}
      <circle cx="44" cy="40" r="1.8" fill="white" />
      <circle cx="52" cy="40" r="1.8" fill="white" />

      {/* smile */}
      <path d="M43 46 Q48 51 53 46" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
