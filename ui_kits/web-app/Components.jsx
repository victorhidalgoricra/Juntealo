// Juntealo — Shared UI Primitives
// Load with <script type="text/babel" src="Components.jsx">

const { useState, useEffect, useRef } = React;

// ─── Tokens ──────────────────────────────────────────────────────────────────
const T = {
  bg: '#fafaf8', surface: '#ffffff', border: '#e8e6df',
  text: '#141412', muted: '#7a7872', faint: '#c8c6bf',
  accent: '#2d5be3', accentBg: '#eef2fd', accentDark: '#1e3fa8',
  green: '#16a34a', greenBg: '#dcfce7',
  amber: '#d97706', amberBg: '#fef3c7',
  red: '#dc2626', redBg: '#fee2e2',
  dark1: '#141412', dark2: '#171717', dark3: '#1e1c19', dark4: '#2b2823',
  darkMuted: '#9d9992', darkText: '#c8c6bf',
};

// ─── Button ───────────────────────────────────────────────────────────────────
function Button({ children, variant = 'primary', size = 'md', disabled, onClick, style }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none', borderRadius: 8, transition: 'background 150ms, opacity 150ms',
    opacity: disabled ? 0.45 : 1,
  };
  const sizes = { sm: { fontSize: 12, padding: '6px 12px' }, md: { fontSize: 14, padding: '9px 18px' }, lg: { fontSize: 15, padding: '12px 24px' } };
  const variants = {
    primary:     { background: T.accent, color: '#fff' },
    outline:     { background: T.surface, color: T.text, border: `1px solid ${T.border}` },
    ghost:       { background: 'transparent', color: T.text },
    destructive: { background: T.red, color: '#fff' },
  };
  return (
    <button style={{ ...base, ...sizes[size], ...variants[variant], ...style }} onClick={disabled ? undefined : onClick}>
      {children}
    </button>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ children, variant }) {
  const variants = {
    pendiente: { background: T.amberBg, color: '#92400e' },
    pagada:    { background: T.greenBg, color: '#065f46' },
    vencida:   { background: T.redBg,   color: '#991b1b' },
    moroso:    { background: T.redBg,   color: '#991b1b' },
    activo:    { background: T.accentBg,color: T.accentDark },
    invitado:  { background: '#f1f5f9', color: '#475569' },
    publica:   { background: T.accentBg,color: T.accent },
    privada:   { background: '#f1f5f9', color: '#475569' },
    green:     { background: T.greenBg, color: '#065f46' },
    amber:     { background: T.amberBg, color: '#92400e' },
    dark:      { background: 'rgba(52,211,153,0.15)', color: '#34d399' },
  };
  const v = variants[variant] || variants.invitado;
  return (
    <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, ...v }}>
      {children}
    </span>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function Card({ children, style, tint, dark, onClick }) {
  const tints = {
    green: { background: T.greenBg, borderColor: '#bbf7d0' },
    blue:  { background: T.accentBg, borderColor: '#c7d7fb' },
    amber: { background: T.amberBg, borderColor: '#fde68a' },
    red:   { background: T.redBg, borderColor: '#fca5a5' },
  };
  const base = dark
    ? { background: T.dark2, border: 'none', borderRadius: 20, padding: 24, boxShadow: '0 10px 25px rgba(0,0,0,.25)' }
    : { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,.05)' };
  return (
    <div style={{ ...base, ...(tints[tint] || {}), cursor: onClick ? 'pointer' : 'default', ...style }} onClick={onClick}>
      {children}
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
function Input({ label, placeholder, value, onChange, type = 'text', error, hint }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{label}</label>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange && onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: T.text,
          background: T.surface, borderRadius: 8, padding: '9px 12px', outline: 'none',
          border: `1px solid ${error ? T.red : focused ? T.accent : T.border}`,
          boxShadow: error ? `0 0 0 3px ${T.redBg}` : focused ? `0 0 0 3px ${T.accentBg}` : 'none',
          transition: 'border-color 150ms, box-shadow 150ms',
        }}
      />
      {hint && !error && <span style={{ fontSize: 11, color: T.muted }}>{hint}</span>}
      {error && <span style={{ fontSize: 11, color: T.red }}>{error}</span>}
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ initials, size = 36, bg = T.accentBg, color = T.accent, border }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: bg, color,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.3, fontWeight: 700,
      border: border ? `2px solid ${border}` : 'none', flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ value, max = 100, color = T.green, height = 6, bg = '#e8e6df', dark }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ height, borderRadius: 999, background: dark ? 'rgba(255,255,255,0.1)' : bg, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: color, transition: 'width 600ms ease' }} />
    </div>
  );
}

// ─── AppShell ─────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard' },
  { id: 'juntas',     label: 'Juntas disponibles' },
  { id: 'new',        label: 'Crear junta' },
  { id: 'account',    label: 'Mi cuenta' },
];

function AppShell({ children, activeScreen, onNav, user }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, fontFamily: "'DM Sans', sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: 240, background: T.surface, borderRight: `1px solid ${T.border}`, padding: '20px 12px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: T.accent, marginBottom: 24, padding: '0 8px' }}>
          Juntas Digitales
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => onNav(item.id)} style={{
              display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 8,
              fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer',
              background: activeScreen === item.id ? T.dark1 : '#f1f5f9',
              color: activeScreen === item.id ? '#fff' : '#475569',
              transition: 'background 150ms',
            }}>
              {item.label}
            </button>
          ))}
        </nav>
        {user && (
          <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar initials={user.initials} size={34} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{user.name}</div>
                <div style={{ fontSize: 11, color: T.muted }}>Score: {user.score}/100</div>
              </div>
            </div>
          </div>
        )}
      </aside>
      {/* Main */}
      <main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto', maxWidth: 900 }}>
        {children}
      </main>
    </div>
  );
}

// ─── LandingNavbar ────────────────────────────────────────────────────────────
function LandingNavbar({ onLogin, onRegister }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100, height: 60, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: '0 32px',
      background: 'rgba(255,255,255,0.95)', borderBottom: `1px solid ${T.border}`,
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: T.accent }}>Juntas Digitales</div>
      <nav style={{ display: 'flex', gap: 24, fontSize: 14, fontWeight: 500, color: T.text }}>
        <span style={{ cursor: 'pointer' }}>Inicio</span>
        <span style={{ cursor: 'pointer' }}>Explorar juntas</span>
      </nav>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Button variant="ghost" size="sm" onClick={onLogin}>Iniciar sesión</Button>
        <Button size="sm" onClick={onRegister}>Registrarme</Button>
      </div>
    </header>
  );
}

// Export all to window for cross-file access
Object.assign(window, {
  T, Button, Badge, Card, Input, Avatar, ProgressBar, AppShell, LandingNavbar
});
