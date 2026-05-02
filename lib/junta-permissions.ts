import { Junta } from '@/types/domain';

export const canDeleteJunta = (row: Pick<Junta, 'admin_id' | 'fecha_inicio' | 'estado' | 'bloqueada' | 'deleted_at'>, currentUserId?: string | null) => {
  const isCreator = row.admin_id === currentUserId;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = row.fecha_inicio ? new Date(row.fecha_inicio) : null;
  if (startDate) startDate.setHours(0, 0, 0, 0);

  const hasStarted = startDate ? startDate <= today : false;

  const estado = String(row.estado ?? '').toLowerCase();
  const isDeleted =
    Boolean(row.deleted_at) ||
    estado === 'eliminada' ||
    estado === 'bloqueada' ||
    row.bloqueada === true;

  return isCreator && !hasStarted && !isDeleted;
};
