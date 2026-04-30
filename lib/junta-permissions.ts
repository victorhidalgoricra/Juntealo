export function canDeleteJunta(
  row: { admin_id: string; fecha_inicio: string; bloqueada?: boolean | null },
  currentUserId: string | null | undefined
): boolean {
  if (!currentUserId) return false;
  const isCreator = row.admin_id === currentUserId;
  const today = new Date().toISOString().slice(0, 10);
  const hasStarted = Boolean(row.fecha_inicio) && row.fecha_inicio <= today;
  const isDeleted = Boolean(row.bloqueada);
  return isCreator && !hasStarted && !isDeleted;
}
