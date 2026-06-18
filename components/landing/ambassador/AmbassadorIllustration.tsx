export function AmbassadorIllustration() {
  return (
    <div
      className="relative overflow-hidden rounded-[var(--r-xl)] bg-[var(--dark-1)] px-5 pb-6 pt-5 shadow-xl sm:px-7 sm:pb-8 sm:pt-7"
      role="img"
      aria-label="Ilustración: un embajador conecta su comunidad a través de Juntealo, impulsando el crecimiento de todos"
    >
      <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--dark-muted)]">
        Tu impacto crece con tu comunidad
      </p>

      <svg
        viewBox="0 0 360 175"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mt-4 w-full"
        aria-hidden="true"
      >
        <style>{`
          .ambassador-glow {
            animation: ambassadorGlow 3.5s ease-in-out infinite;
          }
          @keyframes ambassadorGlow {
            0%, 100% { opacity: 0.11; }
            50% { opacity: 0.04; }
          }
          @media (prefers-reduced-motion: reduce) {
            .ambassador-glow { animation: none; opacity: 0.08; }
          }
        `}</style>

        {/* ── Connection lines drawn first (behind avatars) ── */}

        {/* Ambassador → Hub */}
        <path
          d="M 98 88 Q 128 73 154 88"
          stroke="#5a80f0"
          strokeWidth="1.5"
          strokeDasharray="5 3"
          strokeOpacity="0.55"
        />

        {/* Hub → C1 center-right */}
        <path
          d="M 208 88 L 308 88"
          stroke="#5a80f0"
          strokeWidth="1.5"
          strokeDasharray="5 3"
          strokeOpacity="0.45"
        />

        {/* Hub → C2 upper-right */}
        <path
          d="M 206 79 Q 244 51 281 51"
          stroke="#5a80f0"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          strokeOpacity="0.38"
        />

        {/* Hub → C3 lower-right */}
        <path
          d="M 206 97 Q 244 125 281 125"
          stroke="#5a80f0"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          strokeOpacity="0.38"
        />

        {/* Hub → C4 far upper */}
        <path
          d="M 205 77 Q 231 43 252 40"
          stroke="#5a80f0"
          strokeWidth="1"
          strokeDasharray="3 5"
          strokeOpacity="0.22"
        />

        {/* Hub → C5 far lower */}
        <path
          d="M 205 99 Q 231 133 252 136"
          stroke="#5a80f0"
          strokeWidth="1"
          strokeDasharray="3 5"
          strokeOpacity="0.22"
        />

        {/* ── Activity dot midpoint on ambassador→hub line ── */}
        <circle cx="127" cy="80" r="2.5" fill="#5a80f0" fillOpacity="0.85" />

        {/* ── Far community (small avatars) ── */}
        <circle cx="252" cy="40" r="14" fill="#2b2823" />
        <text
          x="252"
          y="44"
          textAnchor="middle"
          fill="#9d9992"
          fontSize="9"
          fontFamily="DM Sans, system-ui, sans-serif"
          fontWeight="600"
        >
          VN
        </text>

        <circle cx="252" cy="136" r="14" fill="#2b2823" />
        <text
          x="252"
          y="140"
          textAnchor="middle"
          fill="#9d9992"
          fontSize="9"
          fontFamily="DM Sans, system-ui, sans-serif"
          fontWeight="600"
        >
          LP
        </text>

        {/* ── Medium community avatars ── */}
        <circle cx="281" cy="51" r="18" fill="#1e1c19" />
        <text
          x="281"
          y="55"
          textAnchor="middle"
          fill="#c8c6bf"
          fontSize="10"
          fontFamily="DM Sans, system-ui, sans-serif"
          fontWeight="600"
        >
          AL
        </text>

        <circle cx="281" cy="125" r="18" fill="#1e1c19" />
        <text
          x="281"
          y="129"
          textAnchor="middle"
          fill="#c8c6bf"
          fontSize="10"
          fontFamily="DM Sans, system-ui, sans-serif"
          fontWeight="600"
        >
          DR
        </text>

        {/* ── Large community avatar center-right ── */}
        <circle
          cx="308"
          cy="88"
          r="21"
          fill="#1e1c19"
          stroke="#5a80f0"
          strokeWidth="1.5"
          strokeOpacity="0.45"
        />
        <text
          x="308"
          y="92"
          textAnchor="middle"
          fill="#c8c6bf"
          fontSize="12"
          fontFamily="DM Sans, system-ui, sans-serif"
          fontWeight="600"
        >
          MC
        </text>

        {/* ── Active badge on MC ── */}
        <circle cx="325" cy="73" r="9" fill="#141412" />
        <circle cx="325" cy="73" r="7" fill="#16a34a" />
        <path
          d="M 321 73 L 324.5 76.5 L 330 69"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* ── Juntealo hub (center) ── */}
        <circle cx="181" cy="88" r="33" fill="#2d5be3" fillOpacity="0.1" />
        <circle cx="181" cy="88" r="27" fill="#2d5be3" />
        <text
          x="181"
          y="95"
          textAnchor="middle"
          fill="white"
          fontSize="19"
          fontFamily="DM Sans, system-ui, sans-serif"
          fontWeight="700"
        >
          J
        </text>

        {/* ── Ambassador (left, main character) ── */}
        <circle
          cx="68"
          cy="88"
          r="38"
          fill="#2d5be3"
          className="ambassador-glow"
        />
        <circle
          cx="68"
          cy="88"
          r="30"
          fill="#1e1c19"
          stroke="#2d5be3"
          strokeWidth="2"
        />
        {/* Person silhouette: head */}
        <circle cx="68" cy="80" r="9" fill="#5a80f0" fillOpacity="0.9" />
        {/* Person silhouette: shoulders */}
        <path
          d="M 50 105 Q 68 95 86 105"
          fill="#5a80f0"
          fillOpacity="0.7"
        />

        {/* ── Labels below main elements ── */}
        <text
          x="68"
          y="132"
          textAnchor="middle"
          fill="#9d9992"
          fontSize="9"
          fontFamily="DM Sans, system-ui, sans-serif"
        >
          Embajador
        </text>
        <text
          x="181"
          y="130"
          textAnchor="middle"
          fill="#9d9992"
          fontSize="9"
          fontFamily="DM Sans, system-ui, sans-serif"
        >
          Juntealo
        </text>

        {/* ── Community label bottom-right ── */}
        <text
          x="290"
          y="163"
          textAnchor="middle"
          fill="#5a80f0"
          fontSize="9"
          fontFamily="DM Sans, system-ui, sans-serif"
          fontWeight="500"
        >
          Tu comunidad
        </text>
      </svg>
    </div>
  );
}
