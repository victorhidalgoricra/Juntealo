type JuntaDeleteRow = {
  id?: string;
  admin_id: string;
  fecha_inicio?: string | null;
  bloqueada?: boolean | null;
  deleted_at?: string | null;
  estado?: string | null;
};

// Returns today's date as 'YYYY-MM-DD' in America/Lima — same approach as junta-blocking.ts.
// Avoids the UTC-shift bug from new Date('YYYY-MM-DD').setHours(0,0,0,0) in UTC-5.
function getTodayInLima(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function canDeleteJunta(
  row: JuntaDeleteRow,
  currentUserId: string | null | undefined
): boolean {
  if (!currentUserId) return false;

  const isCreator = row.admin_id === currentUserId;

  const todayStr = getTodayInLima();
  // fecha_inicio is stored as 'YYYY-MM-DD'; string comparison is safe for ISO dates.
  const hasStarted = row.fecha_inicio ? row.fecha_inicio <= todayStr : false;

  const isDeleted =
    Boolean(row.deleted_at) ||
    row.estado === 'eliminada' ||
    row.estado === 'bloqueada' ||
    row.bloqueada === true;

  return isCreator && !hasStarted && !isDeleted;
}
