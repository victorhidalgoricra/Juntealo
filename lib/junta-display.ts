export function getJuntaDisplayCode(junta: { id: string; access_code?: string | null }) {
  const accessCode = junta.access_code?.trim().toUpperCase();
  if (accessCode) return accessCode;

  const compactId = junta.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
  return `JNT-${compactId || 'S/C'}`;
}

export function getJuntaDisplayTitle(junta: { id: string; nombre: string; access_code?: string | null }) {
  return `${junta.nombre} · ${getJuntaDisplayCode(junta)}`;
}
