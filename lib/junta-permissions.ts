const APP_TIMEZONE = 'America/Lima';

function getTodayInAppTz(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

type JuntaDeleteRow = {
  id?: string;
  admin_id: string;
  creator_id?: string | null;
  created_by?: string | null;
  fecha_inicio?: string | null;
  bloqueada?: boolean | null;
  blocked?: boolean | null;
  is_deleted?: boolean | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  estado?: string | null;
  status?: string | null;
};

export function canDeleteJunta(
  row: JuntaDeleteRow,
  currentUserId: string | null | undefined
): boolean {
  if (!currentUserId) return false;

  const isCreator =
    row.admin_id === currentUserId ||
    (row.creator_id != null && row.creator_id === currentUserId) ||
    (row.created_by != null && row.created_by === currentUserId);

  const today = getTodayInAppTz();
  const hasStarted = Boolean(row.fecha_inicio) && (row.fecha_inicio as string) <= today;

  const isDeletedOrBlocked =
    Boolean(row.deleted_at) ||
    Boolean(row.deleted_by) ||
    row.bloqueada === true ||
    row.blocked === true ||
    row.is_deleted === true ||
    row.estado === 'eliminada' ||
    row.estado === 'bloqueada' ||
    row.status === 'eliminada' ||
    row.status === 'bloqueada';

  if (process.env.NODE_ENV === 'development') {
    console.debug('[Junta delete permission]', {
      juntaId: row.id,
      userId: currentUserId,
      adminId: row.admin_id,
      creatorId: row.creator_id,
      createdBy: row.created_by,
      fechaInicio: row.fecha_inicio,
      todayAppTz: today,
      isCreator,
      hasStarted,
      isDeletedOrBlocked,
      canDeleteJunta: isCreator && !hasStarted && !isDeletedOrBlocked,
    });
  }

  return isCreator && !hasStarted && !isDeletedOrBlocked;
}
