// Juntealo — Juntas List + Detail Screens
// Depends on Components.jsx

const JUNTAS_DATA = [
  { id: '1', nombre: 'Taxistas Norte', descripcion: 'Ahorro semanal para taxistas del norte de Lima con turnos automáticos.', visibilidad: 'publica', frecuencia: 'semanal', cuota: 200, inicio: '01 may 2025', tipo: 'normal', miembros: 8, max: 10, estado: 'borrador', isOwner: false, isMember: true },
  { id: '2', nombre: 'Familia Ríos', descripcion: 'Junta familiar mensual con incentivos por puntualidad.', visibilidad: 'privada', frecuencia: 'mensual', cuota: 500, inicio: '15 may 2025', tipo: 'incentivo', miembros: 5, max: 5, estado: 'activa', isOwner: false, isMember: true },
  { id: '3', nombre: 'UNI Ingeniería', descripcion: 'Ahorro universitario para gastos académicos del ciclo 2025-I.', visibilidad: 'publica', frecuencia: 'quincenal', cuota: 150, inicio: '10 may 2025', tipo: 'normal', miembros: 3, max: 8, estado: 'borrador', isOwner: true, isMember: false },
  { id: '4', nombre: 'Emprendedoras Lima', descripcion: 'Capital de trabajo rotativo para microempresarias.', visibilidad: 'publica', frecuencia: 'semanal', cuota: 300, inicio: '05 may 2025', tipo: 'normal', miembros: 6, max: 12, estado: 'borrador', isOwner: false, isMember: false },
  { id: '5', nombre: 'Vecinos Miraflores', descripcion: 'Junta del barrio para proyectos de mejora del hogar.', visibilidad: 'privada', frecuencia: 'mensual', cuota: 400, inicio: '20 may 2025', tipo: 'normal', miembros: 4, max: 8, estado: 'borrador', isOwner: false, isMember: false },
];

const MEMBERS_DATA = [
  { initials: 'MR', name: 'María Ríos', turno: 1, score: 94, status: 'pagada' },
  { initials: 'JV', name: 'Juan Vega', turno: 2, score: 88, status: 'pagada' },
  { initials: 'DR', name: 'Diego Ramos', turno: 3, score: 72, status: 'pendiente' },
  { initials: 'AL', name: 'Ana Llerena', turno: 4, score: 95, status: 'pagada' },
  { initials: 'PC', name: 'Pedro Castro', turno: 5, score: 61, status: 'vencida' },
  { initials: 'SL', name: 'Sara López', turno: 6, score: 89, status: 'pagada' },
  { initials: 'FT', name: 'Felipe Torres', turno: 7, score: 77, status: 'pendiente' },
  { initials: 'VN', name: 'Valeria Núñez', turno: 8, score: 91, status: 'pagada' },
];

const PAYMENTS_DATA = [
  { member: 'María Ríos', monto: 200, fecha: '08 abr', estado: 'pagada' },
  { member: 'Juan Vega', monto: 200, fecha: '09 abr', estado: 'pagada' },
  { member: 'Diego Ramos', monto: 200, fecha: null, estado: 'pendiente' },
  { member: 'Ana Llerena', monto: 200, fecha: '08 abr', estado: 'pagada' },
  { member: 'Pedro Castro', monto: 200, fecha: null, estado: 'vencida' },
  { member: 'Sara López', monto: 200, fecha: '10 abr', estado: 'pagada' },
  { member: 'Felipe Torres', monto: 200, fecha: null, estado: 'pendiente' },
  { member: 'Valeria Núñez', monto: 200, fecha: '09 abr', estado: 'pagada' },
];

const FILTERS = [
  { id: 'todas', label: 'Todas' },
  { id: 'publica', label: 'Públicas' },
  { id: 'privada', label: 'Privadas' },
  { id: 'mis', label: 'Mis participaciones' },
];

function JuntaCard({ j, onSelect }) {
  const pct = Math.round((j.miembros / j.max) * 100);
  const cupoCompleto = j.miembros >= j.max;
  const roleLabel = j.isOwner ? 'Eres el creador' : j.isMember ? 'Participando' : null;
  const roleBg = j.isOwner ? { background: '#eef2fd', color: T.accentDark } : { background: T.greenBg, color: '#065f46' };
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20,
      boxShadow: '0 1px 2px rgba(0,0,0,.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14,
      transition: 'transform 150ms, box-shadow 150ms', cursor: 'pointer',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,.08)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,.05)'; }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{j.nombre}</div>
          <Badge variant={j.visibilidad === 'publica' ? 'publica' : 'privada'}>{j.visibilidad === 'publica' ? 'Pública' : 'Privada'}</Badge>
        </div>
        <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.5, marginBottom: 12 }}>{j.descripcion}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px', fontSize: 12, color: T.muted, marginBottom: 10 }}>
          <div><strong style={{ color: T.text }}>Frecuencia:</strong> {j.frecuencia}</div>
          <div><strong style={{ color: T.text }}>Cuota:</strong> S/ {j.cuota}</div>
          <div><strong style={{ color: T.text }}>Inicio:</strong> {j.inicio}</div>
          <div><strong style={{ color: T.text }}>Tipo:</strong> {j.tipo === 'incentivo' ? 'Con incentivos' : 'Normal'}</div>
          <div><strong style={{ color: T.text }}>Miembros:</strong> {j.miembros}/{j.max}</div>
          <div><strong style={{ color: T.text }}>Estado:</strong> {j.estado}</div>
        </div>
        {/* Progress */}
        <div style={{ height: 5, borderRadius: 999, background: T.border, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: cupoCompleto ? T.green : T.accent }} />
        </div>
        {cupoCompleto && <div style={{ background: T.amberBg, borderRadius: 8, padding: '6px 10px', fontSize: 12, color: '#92400e', marginBottom: 6 }}>Cupo completo</div>}
        {roleLabel && <div style={{ borderRadius: 8, padding: '6px 10px', fontSize: 12, marginBottom: 6, ...roleBg }}>{roleLabel}</div>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="outline" size="sm" onClick={() => onSelect(j)}>Ver detalle</Button>
        {!j.isOwner && !j.isMember && !cupoCompleto && (
          j.visibilidad === 'privada'
            ? <Button size="sm">Acceder con código</Button>
            : <Button size="sm">Unirme</Button>
        )}
        {j.isOwner && j.estado === 'borrador' && <Button size="sm">Activar junta</Button>}
        {j.isMember && j.estado !== 'activa' && <Button variant="ghost" size="sm">Retirarme</Button>}
      </div>
    </div>
  );
}

function JuntasListScreen({ onJuntaSelect }) {
  const [filter, setFilter] = React.useState('todas');
  const [query, setQuery] = React.useState('');

  const visible = JUNTAS_DATA.filter(j => {
    const passFilter = filter === 'todas' || (filter === 'publica' && j.visibilidad === 'publica') ||
      (filter === 'privada' && j.visibilidad === 'privada') || (filter === 'mis' && (j.isOwner || j.isMember));
    const passQuery = !query || j.nombre.toLowerCase().includes(query.toLowerCase());
    return passFilter && passQuery;
  });

  return (
    <div>
      {/* Header card */}
      <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 60%, #475569 100%)', borderRadius: 16, padding: '24px', marginBottom: 24, color: '#fff' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>Juntas disponibles</h1>
        <p style={{ fontSize: 14, color: '#cbd5e1', marginBottom: 16 }}>Explora juntas públicas o accede a una privada con tu enlace o código.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginBottom: 14 }}>
          <input
            placeholder="Buscar por nombre o descripción"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, padding: '9px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.95)', color: T.text, outline: 'none' }}
          />
          <Button variant="primary" size="md">Ingresar con código</Button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: filter === f.id ? '#fff' : 'rgba(255,255,255,0.2)', color: filter === f.id ? T.text : '#fff',
              transition: 'background 150ms',
            }}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {visible.map(j => <JuntaCard key={j.id} j={j} onSelect={onJuntaSelect} />)}
        {visible.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px 0', color: T.muted }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>Sin resultados</div>
            <div style={{ fontSize: 14 }}>Prueba cambiar el filtro o buscar otro término.</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Junta Detail ─────────────────────────────────────────────────────────────
function JuntaDetailScreen({ junta, onBack }) {
  const [tab, setTab] = React.useState('resumen');
  const j = junta || JUNTAS_DATA[0];

  return (
    <div>
      <button onClick={onBack} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: T.accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, marginBottom: 16, padding: 0 }}>
        ← Volver a juntas
      </button>

      {/* Header */}
      <div style={{ background: T.dark2, borderRadius: 20, padding: '24px 28px', marginBottom: 20, color: '#fff', position: 'relative' }}>
        <span style={{ position: 'absolute', top: 20, right: 24 }}>
          <Badge variant="green">● Activa</Badge>
        </span>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9d9992', marginBottom: 4 }}>Junta</div>
        <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>{j.nombre}</div>
        <div style={{ fontSize: 14, color: '#9d9992', marginBottom: 20 }}>{j.descripcion}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[['Bolsa esta semana', 'S/ 4,000'], ['Tu turno', 'Semana 8'], ['Score', '94/100'], ['Semana actual', '5 de 10']].map(([label, val]) => (
            <div key={label} style={{ background: '#1e1c19', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: '#9d9992' }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{val}</div>
            </div>
          ))}
        </div>
        {/* Members avatars */}
        <div style={{ display: 'flex', gap: 6, marginTop: 16, alignItems: 'center' }}>
          {MEMBERS_DATA.slice(0, 5).map(m => (
            <Avatar key={m.initials} initials={m.initials} size={32} bg="#2b2823" color="#c8c6bf" />
          ))}
          <span style={{ fontSize: 12, color: '#9d9992', marginLeft: 4 }}>+{MEMBERS_DATA.length - 5} más</span>
          <div style={{ marginLeft: 'auto' }}>
            <ProgressBar value={50} color={T.green} bg="#2b2823" dark height={6} />
            <div style={{ fontSize: 11, color: '#9d9992', marginTop: 4 }}>Semana 5 / 5 de 10 pagaron ✓</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: `1px solid ${T.border}`, paddingBottom: 0 }}>
        {['resumen', 'miembros', 'pagos'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, padding: '8px 18px',
            border: 'none', borderBottom: `2px solid ${tab === t ? T.accent : 'transparent'}`,
            color: tab === t ? T.accent : T.muted, background: 'transparent', cursor: 'pointer',
          }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'resumen' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[['Frecuencia de pago', j.frecuencia], ['Cuota base', `S/ ${j.cuota}`], ['Tipo', j.tipo === 'incentivo' ? 'Con incentivos' : 'Normal'], ['Participantes', `${j.miembros}/${j.max}`], ['Inicio', j.inicio], ['Estado', j.estado]].map(([k, v]) => (
            <Card key={k} style={{ padding: 14 }}>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>{k}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{v}</div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'miembros' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {MEMBERS_DATA.map(m => (
            <Card key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar initials={m.initials} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{m.name}</div>
                <div style={{ fontSize: 12, color: T.muted }}>Turno #{m.turno} · Score: {m.score}/100</div>
              </div>
              <Badge variant={m.status}>{m.status}</Badge>
            </Card>
          ))}
        </div>
      )}

      {tab === 'pagos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PAYMENTS_DATA.map((p, i) => (
            <Card key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{p.member}</div>
                <div style={{ fontSize: 12, color: T.muted }}>{p.fecha ? `Pagó el ${p.fecha}` : 'Sin fecha registrada'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, fontWeight: 700, color: T.text }}>S/ {p.monto}</div>
                <Badge variant={p.estado}>{p.estado}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { JuntasListScreen, JuntaDetailScreen });
