type JuntaDeleteRow = {
  id?: string;
  admin_id: string;
  bloqueada?: boolean | null;
  deleted_at?: string | null;
  estado?: string | null;
};

type JuntaLeaveRow = {
  estado?: string | null;
};

export function canLeaveJunta(row: JuntaLeaveRow, isMember: boolean): boolean {
  // Once activated, a member's place and assigned turn are part of an
  // in-progress payment cycle and must no longer be removable.
  return isMember && row.estado !== 'activa' && row.estado !== 'cerrada';
}

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
