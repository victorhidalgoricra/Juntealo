'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useAppStore } from '@/store/app-store';
import { formatCalendarDate } from '@/lib/calendar-date';

export default function SchedulePage({ params }: { params: { id: string } }) {
  const schedules = useAppStore((s) => s.schedules.filter((x) => x.junta_id === params.id));
  return (
    <Card>
      <h2 className="mb-3 break-words text-lg font-semibold">Cronograma de cuotas</h2>
      <div className="space-y-2">
        {schedules.map((s) => (
          <div key={s.id} className="grid gap-1 rounded border p-2 text-sm sm:grid-cols-4">
            <p>#{s.cuota_numero}</p>
            <p>{formatCalendarDate(s.fecha_vencimiento)}</p>
            <p>S/ {s.monto}</p>
            <Badge>{s.estado}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}
