// Juntealo — Landing Page Screen
// Depends on Components.jsx

const FEATURES = [
  { title: 'Score de confianza', desc: 'Mide cumplimiento y constancia para tomar mejores decisiones en cada ronda.', bg: T.dark1, textColor: '#fff', descColor: '#9d9992' },
  { title: 'Sin caos en WhatsApp', desc: 'Todo el estado de aportes y turnos en un panel único y claro para el grupo.', bg: T.accentBg, textColor: T.text, descColor: T.muted },
  { title: 'Incentivos por turno', desc: 'Configura beneficios para el orden y la puntualidad de cada integrante.', bg: T.greenBg, textColor: T.text, descColor: T.muted },
  { title: 'Seguimiento en tiempo real', desc: 'Visualiza aportes, turnos y avances del ciclo sin perder el contexto del grupo.', bg: T.amberBg, textColor: T.text, descColor: T.muted },
  { title: 'Funciona en el celular', desc: 'Diseño móvil primero para registrar pagos y avances en segundos.', bg: T.accentBg, textColor: T.text, descColor: T.muted },
  { title: 'Para cualquier grupo', desc: 'Taxistas, universitarios, familias y emprendedores en un mismo sistema.', bg: '#FEE2E2', textColor: T.text, descColor: T.muted },
];

const STEPS = [
  { n: 1, title: 'Crea la junta', desc: 'Define monto, personas, frecuencia e incentivos.' },
  { n: 2, title: 'Invita a tu grupo', desc: 'Comparte enlace de invitación y verificación de identidad.' },
  { n: 3, title: 'Todos aportan', desc: 'Yape/Plin/tarjeta, recordatorios automáticos y control de mora.' },
  { n: 4, title: 'El turno cobra', desc: 'Desembolso con trazabilidad completa.' },
];

const STATS = [
  { value: '2,400+', label: 'personas registradas' },
  { value: 'S/ 480k', label: 'gestionados en juntas' },
  { value: '94%', label: 'tasa de pago a tiempo' },
];

function HeroDemo() {
  return (
    <div style={{ background: T.dark1, borderRadius: 20, padding: '24px 28px', color: '#fff', position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,.3)' }}>
      <span style={{ position: 'absolute', top: 20, right: 24 }}>
        <Badge variant="green">● Activa</Badge>
      </span>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9d9992' }}>Junta de ejemplo</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>Taxistas Norte</div>
      <div style={{ fontSize: 13, color: '#9d9992', marginTop: 2, marginBottom: 18 }}>Ahorro semanal con turnos automáticos</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
        {[['Bolsa esta semana', 'S/ 4,000'], ['Tu turno', 'Semana 8'], ['Score', '94/100'], ['Semana actual', '5 de 10']].map(([l, v]) => (
          <div key={l} style={{ background: '#1e1c19', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: '#9d9992' }}>{l}</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {['JV', 'RM', 'SL', 'PC', 'AG'].map(i => <Avatar key={i} initials={i} size={30} bg="#2b2823" color="#c8c6bf" />)}
        <div style={{ display: 'inline-flex', alignItems: 'center', padding: '0 10px', borderRadius: 999, border: '1px solid #3d3933', fontSize: 11, color: '#c8c6bf' }}>+5</div>
      </div>
      <div>
        <div style={{ height: 6, borderRadius: 999, background: '#2b2823', overflow: 'hidden' }}>
          <div style={{ width: '50%', height: '100%', borderRadius: 999, background: T.green }} />
        </div>
        <div style={{ fontSize: 11, color: '#9d9992', marginTop: 6 }}>Semana 5 / 5 de 10 pagaron ✓</div>
      </div>
    </div>
  );
}

function LandingScreen({ onRegister, onLogin }) {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: T.bg, minHeight: '100vh' }}>
      <LandingNavbar onLogin={onLogin} onRegister={onRegister} />

      {/* Hero */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '56px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: T.greenBg, borderRadius: 999, padding: '5px 14px', fontSize: 12, fontWeight: 700, color: T.green, marginBottom: 20 }}>
            ● Más de 120 juntas activas esta semana
          </div>
          <h1 style={{ fontSize: 46, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.04em', color: T.text, marginBottom: 18 }}>
            Tu junta, <span style={{ color: T.accent }}>digital</span> y sin drama.
          </h1>
          <p style={{ fontSize: 17, color: T.muted, lineHeight: 1.7, maxWidth: 440, marginBottom: 28 }}>
            Organiza turnos, aportes y cobros con tu grupo — sin WhatsApps perdidos, sin cuentas confusas, sin mora sin control.
          </p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
            <Button onClick={onRegister}>Crear mi junta gratis →</Button>
            <Button variant="outline">Explorar juntas</Button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex' }}>
              {['AL', 'MC', 'DR', 'VN', 'LP'].map((i, idx) => (
                <Avatar key={i} initials={i} size={36} border={T.bg} style={{ marginLeft: idx === 0 ? 0 : -8, zIndex: 10 - idx }} />
              ))}
            </div>
            <div style={{ fontSize: 13, color: T.muted }}>+2,400 personas ya gestionan sus juntas aquí</div>
          </div>
        </div>
        <HeroDemo />
      </section>

      {/* Features */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 32px 48px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background: f.bg, border: `1px solid ${T.border}`, borderRadius: 14, padding: '22px 20px' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: f.textColor, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: f.descColor }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 32px 48px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.accent, marginBottom: 8 }}>Así funciona</div>
        <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: T.text, marginBottom: 28 }}>De la idea al cobro en 4 pasos</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {STEPS.map((s, i) => (
            <div key={s.n} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, marginBottom: 16, background: i === 0 ? T.accent : T.surface, color: i === 0 ? '#fff' : T.text, border: i === 0 ? 'none' : `1px solid ${T.border}` }}>
                {s.n}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 32px 48px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: T.text, marginBottom: 28 }}>Juntas que funcionan, en números</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {STATS.map(s => (
            <div key={s.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: '24px 20px' }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 38, fontWeight: 700, color: T.text }}>{s.value}</div>
              <div style={{ fontSize: 13, color: T.muted, marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 1100, margin: '0 auto 60px', padding: '0 32px' }}>
        <div style={{ background: T.accent, borderRadius: 20, padding: '40px 48px', textAlign: 'center', color: '#fff' }}>
          <h2 style={{ fontSize: 30, fontWeight: 700, marginBottom: 12 }}>¿Listo para crear tu primera junta?</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginBottom: 28 }}>Es gratis, rápido y sin complicaciones.</p>
          <Button onClick={onRegister} style={{ background: '#fff', color: T.accent }}>
            Crear mi junta gratis →
          </Button>
        </div>
      </section>
    </div>
  );
}

Object.assign(window, { LandingScreen });
