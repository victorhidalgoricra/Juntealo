type JuntaDeleteRow = {
  id?: string;
  admin_id: string;
  fecha_inicio?: string | null;
  bloqueada?: boolean | null;
  deleted_at?: string | null;
  estado?: string | null;
};

export function canDeleteJunta(
  row: JuntaDeleteRow,
  currentUserId: string | null | undefined
): boolean {
  if (!currentUserId) return false;

  const isCreator = row.admin_id === currentUserId;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = row.fecha_inicio ? new Date(row.fecha_inicio) : null;
  if (startDate) startDate.setHours(0, 0, 0, 0);

  const hasStarted = startDate ? startDate <= today : false;

  const isDeleted =
    Boolean(row.deleted_at) ||
    row.estado === 'eliminada' ||
    row.estado === 'bloqueada' ||
    row.bloqueada === true;

  return isCreator && !hasStarted && !isDeleted;
}
