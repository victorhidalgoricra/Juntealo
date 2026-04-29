'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { resetPasswordSchema } from '@/features/auth/schemas';
import { hasSupabase } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { mapAuthErrorMessage } from '@/services/auth.service';

type RecoveryState = 'verifying' | 'ready' | 'invalid';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { register, handleSubmit, setError, formState } = useForm<z.infer<typeof resetPasswordSchema>>();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recoveryState, setRecoveryState] = useState<RecoveryState>(!hasSupabase ? 'ready' : 'verifying');

  useEffect(() => {
    if (!hasSupabase || !supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryState('ready');
      }
    });

    const timer = setTimeout(() => {
      setRecoveryState((prev) => (prev === 'ready' ? 'ready' : 'invalid'));
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  if (recoveryState === 'invalid') {
    return (
      <Card className="w-full space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Enlace no válido</h1>
          <p className="text-sm text-slate-500">Este enlace no es válido o ha expirado.</p>
        </div>
        <Button className="w-full" onClick={() => router.push('/forgot-password')}>
          Solicitar nuevo enlace
        </Button>
      </Card>
    );
  }

  return (
    <Card className="w-full space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Nueva contraseña</h1>
        <p className="text-sm text-slate-500">Define una nueva contraseña segura para tu cuenta.</p>
      </div>

      <form
        className="space-y-3"
        onSubmit={handleSubmit(async (values) => {
          if (recoveryState !== 'ready') return;
          setMessage(null);
          setErrorMessage(null);
          const parsed = resetPasswordSchema.safeParse(values);
          if (!parsed.success) {
            const issue = parsed.error.issues[0];
            setError(issue.path[0] as 'password' | 'confirmPassword', { message: issue.message });
            return;
          }

          try {
            setLoading(true);
            if (hasSupabase && supabase) {
              const { error } = await supabase.auth.updateUser({ password: values.password });
              if (error) throw error;
            }
            setMessage('Contraseña actualizada correctamente.');
            setTimeout(() => router.push('/login'), 1500);
          } catch (error) {
            console.error('[ResetPassword] update error', error);
            setErrorMessage(error instanceof Error ? mapAuthErrorMessage(error.message) : 'No se pudo actualizar la contraseña.');
          } finally {
            setLoading(false);
          }
        })}
      >
        <label className="text-sm font-medium">Nueva contraseña</label>
        <Input
          type="password"
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          disabled={recoveryState === 'verifying'}
          {...register('password')}
        />
        <label className="text-sm font-medium">Confirmar contraseña</label>
        <Input
          type="password"
          placeholder="Repite tu contraseña"
          autoComplete="new-password"
          disabled={recoveryState === 'verifying'}
          {...register('confirmPassword')}
        />
        <Button className="w-full" disabled={loading || recoveryState === 'verifying'}>
          {loading ? 'Guardando...' : recoveryState === 'verifying' ? 'Verificando enlace...' : 'Guardar nueva contraseña'}
        </Button>
      </form>

      {formState.errors.password && <p className="text-xs text-red-500">{formState.errors.password.message}</p>}
      {formState.errors.confirmPassword && <p className="text-xs text-red-500">{formState.errors.confirmPassword.message}</p>}
      {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}
      {message && <p className="rounded-md bg-emerald-50 p-2 text-xs text-emerald-700">{message}</p>}

      <Link href="/login" className="text-sm text-muted hover:text-fg hover:underline">
        Volver a iniciar sesión
      </Link>
    </Card>
  );
}
