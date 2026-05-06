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
  const isDeletableEstado = row.estado === 'borrador' || row.estado === 'cerrada';
  const isDeletedOrBlocked =
    Boolean(row.deleted_at) ||
    row.estado === 'eliminada' ||
    row.estado === 'bloqueada' ||
    row.bloqueada === true;

  // Creators can delete drafts (before activation) and finalized juntas (cerrada).
  // Active juntas cannot be deleted to protect in-progress rounds.
  return isCreator && isDeletableEstado && !isDeletedOrBlocked;
}
