type JuntaDeleteRow = {
  id?: string;
  admin_id: string;
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
  const isDraft = row.estado === 'borrador';
  const isDeletedOrBlocked =
    Boolean(row.deleted_at) ||
    row.estado === 'eliminada' ||
    row.estado === 'bloqueada' ||
    row.bloqueada === true;

  // Estado is the source of truth: borrador = deletable, activa = not deletable.
  // fecha_inicio is intentionally not checked — a borrador junta on its start date
  // has not yet activated and the creator should still be able to cancel it.
  return isCreator && isDraft && !isDeletedOrBlocked;
}
