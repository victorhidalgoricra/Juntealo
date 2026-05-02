'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { supabase } from '@/lib/supabase';
import { hasSupabase } from '@/lib/env';

type FieldErrors = {
  current?: string;
  next?: string;
  confirm?: string;
};

export function SettingsPanel() {
  const { user } = useAuthStore();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const validate = (): boolean => {
    const errors: FieldErrors = {};

    if (!current) errors.current = 'La contraseña actual es obligatoria.';
    if (!next) {
      errors.next = 'La nueva contraseña es obligatoria.';
    } else if (next.length < 8) {
      errors.next = 'La nueva contraseña debe tener al menos 8 caracteres.';
    } else if (next === current) {
      errors.next = 'La nueva contraseña debe ser distinta a la actual.';
    }
    if (!confirm) {
      errors.confirm = 'Debes repetir la nueva contraseña.';
    } else if (next && confirm !== next) {
      errors.confirm = 'Las contraseñas no coinciden.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!validate()) return;
    if (!hasSupabase || !supabase || !user?.email) {
      setFeedback({ type: 'error', message: 'No hay sesión activa. Recarga la página.' });
      return;
    }

    setSaving(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: current
      });

      if (signInError) {
        setFieldErrors({ current: 'La contraseña actual no es correcta.' });
        setSaving(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: next });

      if (updateError) {
        setFeedback({ type: 'error', message: updateError.message ?? 'No se pudo actualizar la contraseña.' });
        setSaving(false);
        return;
      }

      setFeedback({ type: 'success', message: 'Contraseña actualizada correctamente.' });
      setCurrent('');
      setNext('');
      setConfirm('');
      setFieldErrors({});
    } catch {
      setFeedback({ type: 'error', message: 'Ocurrió un error inesperado. Inténtalo nuevamente.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="max-w-2xl space-y-6 p-5">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Configuración</h1>
        <p className="text-sm text-slate-600">Administra la seguridad de tu cuenta.</p>
      </div>

      <section className="space-y-4 rounded-md border border-slate-200 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Cambiar contraseña</h2>

        {feedback && (
          <p className={`rounded-md px-3 py-2 text-sm ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {feedback.message}
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-800">Contraseña actual</label>
            <Input
              type="password"
              value={current}
              onChange={(e) => { setCurrent(e.target.value); setFieldErrors((prev) => ({ ...prev, current: undefined })); }}
              placeholder="Tu contraseña actual"
              autoComplete="current-password"
            />
            {fieldErrors.current && (
              <p className="text-xs text-red-600">{fieldErrors.current}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-800">Nueva contraseña</label>
            <Input
              type="password"
              value={next}
              onChange={(e) => { setNext(e.target.value); setFieldErrors((prev) => ({ ...prev, next: undefined })); }}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
            />
            {fieldErrors.next && (
              <p className="text-xs text-red-600">{fieldErrors.next}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-800">Repetir nueva contraseña</label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setFieldErrors((prev) => ({ ...prev, confirm: undefined })); }}
              placeholder="Repite la nueva contraseña"
              autoComplete="new-password"
            />
            {fieldErrors.confirm && (
              <p className="text-xs text-red-600">{fieldErrors.confirm}</p>
            )}
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? 'Actualizando...' : 'Actualizar contraseña'}
          </Button>
        </form>
      </section>
    </Card>
  );
}
