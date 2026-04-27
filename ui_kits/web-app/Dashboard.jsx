// Juntealo — Dashboard Screen
// Depends on Components.jsx being loaded first

const { useState, useEffect } = React;

const DEMO_JUNTAS = [
  { id: '1', nombre: 'Taxistas Norte', miembros: 8, cuota: 200, frecuencia: 'semanal', turno: 3, nextDate: '15 abr', status: 'pendiente' },
  { id: '2', nombre: 'Familia Ríos', miembros: 5, cuota: 500, frecuencia: 'mensual', turno: 1, nextDate: '01 may', status: 'al_dia' },
  { id: '3', nombre: 'UNI Ingeniería', miembros: 3, cuota: 150, frecuencia: 'quincenal', turno: 5, nextDate: '20 abr', status: 'al_dia' },
];

function DashboardHeader({ user }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Avatar initials={user.initials} size={48} bg="#2d5be3" color="#fff" />
        <div>
          <div style={{ fontSize: 13, color: T.muted }}>Buenos días</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: T.text }}>{user.name}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', border: `1px solid ${T.border}`, background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16 }}>🔔</div>
      </div>
    </div>
  );
}

function ScoreCard({ score, level, progress, pointsToNext }) {
  const [animProg, setAnimProg] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimProg(progress), 100);
    return () => clearTimeout(t);
  }, [progress]);
  return (
    <Card dark style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
        {/* Ring */}
        <div style={{ width: 84, height: 84, borderRadius: '50%', border: '5px solid #34d399', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 28, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: 10, color: '#9d9992' }}>/100</div>
        </div>
        <div style={{ flex: 1 }}>
          <Badge variant="dark">{level}</Badge>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginTop: 6 }}>Tu score de junta</div>
          <div style={{ fontSize: 12, color: '#9d9992', marginTop: 4, lineHeight: 1.5 }}>Pagos a tiempo, ciclos completados y referencias acumulan tu reputación.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <ProgressBar value={animProg} color="#34d399" dark />
            <span style={{ fontSize: 11, color: '#9d9992', flexShrink: 0 }}>{pointsToNext} pts para <strong style={{ color: '#fff' }}>Máximo</strong></span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function KpiGrid({ payRate, cycles, refs }) {
  const kpis = [
    { icon: '📅', value: `${payRate}%`, label: 'Pagos a tiempo', color: T.green },
    { icon: '🔄', value: cycles, label: 'Ciclos completados', color: T.text },
    { icon: '👥', value: refs, label: 'Referidos activos', color: T.text },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
      {kpis.map(k => (
        <Card key={k.label} style={{ padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 20 }}>{k.icon}</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 26, fontWeight: 700, color: k.color, marginTop: 4 }}>{k.value}</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{k.label}</div>
        </Card>
      ))}
    </div>
  );
}

function UpcomingPayoutCard() {
  return (
    <Card tint="green" style={{ marginBottom: 16, cursor: 'pointer' }}>
      <div style={{ fontSize: 13, color: '#065f46', fontWeight: 600 }}>Tu próximo cobro</div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 36, fontWeight: 700, color: '#065f46', margin: '4px 0' }}>S/ 4,000</div>
      <div style={{ fontSize: 13, color: '#16a34a' }}>Turno #3 · Taxistas Norte · 15 abr 2025</div>
    </Card>
  );
}

function ContributionCard() {
  return (
    <Card style={{ background: T.accent, border: 'none', marginBottom: 16 }}>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Total aportado</div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 36, fontWeight: 700, color: '#fff', margin: '4px 0' }}>S/ 800</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>4 semanas · ciclo actual</div>
    </Card>
  );
}

function PendingBanner() {
  return (
    <Card tint="amber" style={{ marginBottom: 16, cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⏺</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>Tienes un pago pendiente</div>
            <div style={{ fontSize: 13, color: '#92400e' }}>Cuota semanal · Taxistas Norte · S/ 200</div>
          </div>
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#1e3fa8' }}>Pagar →</span>
      </div>
    </Card>
  );
}

function JuntaListItem({ item, onSelect }) {
  return (
    <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, cursor: 'pointer', marginBottom: 8 }} onClick={() => onSelect(item)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🚕</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{item.nombre}</div>
          <div style={{ fontSize: 12, color: T.muted }}>{item.miembros} integrantes · S/ {item.cuota}/{item.frecuencia}</div>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.accent }}>Turno #{item.turno}</div>
        <div style={{ fontSize: 11, color: T.muted }}>{item.nextDate}</div>
        <Badge variant={item.status === 'pendiente' ? 'pendiente' : 'green'}>{item.status === 'pendiente' ? 'Pago pendiente' : 'Al día'}</Badge>
      </div>
    </Card>
  );
}

function ActiveJuntasSection({ onSelect, onNav }) {
  const [tab, setTab] = useState('activas');
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>Mis juntas activas</div>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.accent, cursor: 'pointer' }} onClick={() => onNav('juntas')}>Ver todas →</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {['activas', 'historial'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 13, padding: '5px 14px', borderRadius: 999, border: `1px solid ${tab === t ? T.accent : T.border}`,
            color: tab === t ? T.accent : T.muted, background: tab === t ? T.accentBg : T.surface, cursor: 'pointer', fontWeight: 500,
          }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>
      {tab === 'activas' ? DEMO_JUNTAS.map(j => <JuntaListItem key={j.id} item={j} onSelect={onSelect} />) : (
        <Card style={{ padding: 20, textAlign: 'center', color: T.muted, fontSize: 14 }}>Todavía no tienes historial de juntas finalizadas.</Card>
      )}
    </section>
  );
}

function DashboardScreen({ user, onNav, onJuntaSelect }) {
  return (
    <div>
      <DashboardHeader user={user} />
      <PendingBanner />
      <ScoreCard score={87} level="Élite" progress={72} pointsToNext={13} />
      <KpiGrid payRate={94} cycles={3} refs={2} />
      <UpcomingPayoutCard />
      <ContributionCard />
      <ActiveJuntasSection onSelect={onJuntaSelect} onNav={onNav} />
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <Button onClick={() => onNav('new')}>Crear nueva junta</Button>
        <Button variant="outline" onClick={() => onNav('juntas')}>Explorar juntas</Button>
      </div>
    </div>
  );
}

Object.assign(window, { DashboardScreen });
