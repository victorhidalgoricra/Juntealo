// Juntealo — Auth Screens (Login + Register)
// Depends on Components.jsx

function LoginScreen({ onLogin, onGoRegister }) {
  const [email, setEmail] = React.useState('');
  const [pass, setPass] = React.useState('');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, fontFamily: "'DM Sans', sans-serif" }}>
      {/* Left brand panel */}
      <div style={{ flex: 1, background: T.dark1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 56px', color: '#fff' }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: T.accent, marginBottom: 32 }}>Juntas Digitales</div>
        <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.2, maxWidth: 380, marginBottom: 20 }}>Tu junta, digital y sin drama.</div>
        <div style={{ fontSize: 16, color: '#9d9992', lineHeight: 1.6, maxWidth: 360 }}>Organiza turnos, aportes y cobros con tu grupo — sin WhatsApps perdidos, sin cuentas confusas.</div>
        <div style={{ marginTop: 48, display: 'flex', gap: 12 }}>
          {['AL', 'MC', 'DR', 'VN', 'LP'].map((i, idx) => (
            <Avatar key={i} initials={i} size={40} bg="#2b2823" color="#c8c6bf" />
          ))}
          <div style={{ fontSize: 13, color: '#9d9992', alignSelf: 'center', marginLeft: 4 }}>+2,400 personas ya gestionan sus juntas aquí</div>
        </div>
      </div>
      {/* Right form panel */}
      <div style={{ width: 460, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 48px', background: T.surface }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: T.text, marginBottom: 6 }}>Iniciar sesión</div>
        <div style={{ fontSize: 14, color: T.muted, marginBottom: 32 }}>Accede a tu cuenta para gestionar tus juntas.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Correo electrónico" placeholder="tu@correo.com" type="email" value={email} onChange={setEmail} />
          <Input label="Contraseña" placeholder="••••••••" type="password" value={pass} onChange={setPass} />
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 13, color: T.accent, cursor: 'pointer', fontWeight: 600 }}>¿Olvidaste tu contraseña?</span>
          </div>
          <Button onClick={() => onLogin({ email, pass })} style={{ width: '100%', justifyContent: 'center', marginTop: 4, padding: '11px 0' }}>
            Iniciar sesión
          </Button>
          <div style={{ textAlign: 'center', fontSize: 14, color: T.muted }}>
            ¿No tienes cuenta?{' '}
            <span style={{ color: T.accent, fontWeight: 600, cursor: 'pointer' }} onClick={onGoRegister}>Regístrate gratis</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RegisterScreen({ onRegister, onGoLogin }) {
  const [form, setForm] = React.useState({ nombre: '', email: '', celular: '', dni: '', pass: '' });
  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ flex: 1, background: T.dark1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 56px', color: '#fff' }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: T.accent, marginBottom: 32 }}>Juntas Digitales</div>
        <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.2, maxWidth: 360, marginBottom: 20 }}>Empieza a ahorrar con tu grupo hoy.</div>
        <div style={{ fontSize: 16, color: '#9d9992', lineHeight: 1.6, maxWidth: 340 }}>Crea tu cuenta en segundos. Verificamos tu identidad para proteger a todo el grupo.</div>
        <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[['🛡️', 'Verificación de identidad por DNI'],['📱', 'Compatible con Yape, Plin y tarjeta'],['🧾', 'Historial completo de pagos y turnos']].map(([icon, text]) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: '#9d9992' }}>
              <span style={{ fontSize: 20 }}>{icon}</span>{text}
            </div>
          ))}
        </div>
      </div>
      <div style={{ width: 480, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 48px', background: T.surface, overflowY: 'auto' }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: T.text, marginBottom: 4 }}>Crear cuenta</div>
        <div style={{ fontSize: 14, color: T.muted, marginBottom: 28 }}>Es gratis. Sin tarjeta de crédito requerida.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Nombre completo" placeholder="Como aparece en tu DNI" value={form.nombre} onChange={set('nombre')} />
          <Input label="Correo electrónico" placeholder="tu@correo.com" type="email" value={form.email} onChange={set('email')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Celular" placeholder="987 654 321" value={form.celular} onChange={set('celular')} hint="Solo dígitos" />
            <Input label="DNI" placeholder="12345678" value={form.dni} onChange={set('dni')} hint="8 dígitos" />
          </div>
          <Input label="Contraseña" placeholder="Mínimo 8 caracteres" type="password" value={form.pass} onChange={set('pass')} />
          <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>
            Al registrarte, aceptas los <span style={{ color: T.accent }}>Términos de uso</span> y la <span style={{ color: T.accent }}>Política de privacidad</span>.
          </div>
          <Button onClick={() => onRegister(form)} style={{ width: '100%', justifyContent: 'center', padding: '11px 0' }}>
            Crear cuenta gratis →
          </Button>
          <div style={{ textAlign: 'center', fontSize: 14, color: T.muted }}>
            ¿Ya tienes cuenta?{' '}
            <span style={{ color: T.accent, fontWeight: 600, cursor: 'pointer' }} onClick={onGoLogin}>Inicia sesión</span>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LoginScreen, RegisterScreen });
