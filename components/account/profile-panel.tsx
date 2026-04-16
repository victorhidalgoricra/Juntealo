'use client';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';

export function ProfilePanel() {
  const { user, setUser } = useAuthStore();
  if (!user) return null;

  return (
    <Card className="max-w-xl space-y-3">
      <h1 className="text-xl font-semibold">Perfil</h1>
      {!user.preferred_payout_method && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Completa tu medio de pago para poder recibir aportes en tus turnos.
        </p>
      )}
      <Input value={user.first_name ?? ''} onChange={(e) => setUser({ ...user, first_name: e.target.value })} placeholder="Primer nombre" />
      <Input value={user.second_name ?? ''} onChange={(e) => setUser({ ...user, second_name: e.target.value })} placeholder="Segundo nombre (opcional)" />
      <Input value={user.paternal_last_name ?? ''} onChange={(e) => setUser({ ...user, paternal_last_name: e.target.value })} placeholder="Apellido paterno (opcional)" />
      <Input value={user.nombre} onChange={(e) => setUser({ ...user, nombre: e.target.value })} placeholder="Nombre visible" />
      <Input value={user.celular} onChange={(e) => setUser({ ...user, celular: e.target.value })} placeholder="Celular" />
      <Input value={user.email} disabled />
      <Input value={user.dni ?? ''} onChange={(e) => setUser({ ...user, dni: e.target.value })} placeholder="DNI opcional" />
      <div className="space-y-2 rounded-md border border-slate-200 p-3">
        <p className="text-sm font-semibold text-slate-800">Cómo quieres recibir aportes</p>
        <select
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          value={user.preferred_payout_method ?? ''}
          onChange={(e) => setUser({ ...user, preferred_payout_method: (e.target.value || undefined) as typeof user.preferred_payout_method })}
        >
          <option value="">Selecciona método</option>
          <option value="yape">Yape</option>
          <option value="plin">Plin</option>
          <option value="bank_account">Cuenta bancaria</option>
          <option value="cash">Efectivo</option>
          <option value="other">Otro</option>
        </select>
        <Input value={user.payout_account_name ?? ''} onChange={(e) => setUser({ ...user, payout_account_name: e.target.value })} placeholder="Alias / titular" />
        <Input value={user.payout_phone_number ?? ''} onChange={(e) => setUser({ ...user, payout_phone_number: e.target.value })} placeholder="Celular para Yape/Plin" />
        <Input value={user.payout_bank_name ?? ''} onChange={(e) => setUser({ ...user, payout_bank_name: e.target.value })} placeholder="Banco" />
        <Input value={user.payout_account_number ?? ''} onChange={(e) => setUser({ ...user, payout_account_number: e.target.value })} placeholder="N° de cuenta" />
        <Input value={user.payout_cci ?? ''} onChange={(e) => setUser({ ...user, payout_cci: e.target.value })} placeholder="CCI" />
        <Input value={user.payout_notes ?? ''} onChange={(e) => setUser({ ...user, payout_notes: e.target.value })} placeholder="Notas (opcional)" />
      </div>
      <Button>Guardar cambios</Button>
    </Card>
  );
}
