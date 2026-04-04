'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { forgotPasswordSchema } from '@/features/auth/schemas';
import { supabase } from '@/lib/supabase';
import { hasSupabase } from '@/lib/env';
import { mapAuthErrorMessage } from '@/services/auth.service';

export default function ForgotPasswordPage() {
  const { register, handleSubmit, setError, formState, watch } = useForm<z.infer<typeof forgotPasswordSchema>>();
  const [loadingReset, setLoadingReset] = useState(false);
  const [loadingResend, setLoadingResend] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const email = watch('email');

  const validateEmail = () => {
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(issue.path[0] as 'email', { message: issue.message });
      return false;
    }
    return true;
  };

  return (
    <Card className="w-full space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Centro de recuperación</h1>
        <p className="text-sm text-slate-500">Desde aquí puedes recuperar tu contraseña o reenviar el correo de confirmación.</p>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">Correo</label>
        <Input placeholder="correo@ejemplo.com" {...register('email')} />

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            disabled={loadingReset}
            onClick={handleSubmit(async (values) => {
              setMessage(null);
              setErrorMessage(null);

              try {
                setLoadingReset(true);
                if (hasSupabase && supabase) {
                  const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
                    redirectTo: `${window.location.origin}/reset-password`
                  });
                  if (error) throw error;
                }

                setMessage('Si el correo existe, te enviamos instrucciones para restablecer tu contraseña.');
              } catch (error) {
                console.error('[ForgotPassword] reset flow error', error);
                setErrorMessage(error instanceof Error ? mapAuthErrorMessage(error.message) : 'No pudimos iniciar la recuperación.');
              } finally {
                setLoadingReset(false);
              }
            })}
          >
            {loadingReset ? 'Enviando...' : 'Recuperar contraseña'}
          </Button>

          <Button
            variant="outline"
            disabled={loadingResend}
            onClick={async () => {
              setMessage(null);
              setErrorMessage(null);
              if (!validateEmail()) return;

              try {
                setLoadingResend(true);
                if (hasSupabase && supabase) {
                  const { error } = await supabase.auth.resend({
                    type: 'signup',
                    email,
                    options: { emailRedirectTo: `${window.location.origin}/login?confirmed=1` }
                  });
                  if (error) throw error;
                }

                setMessage('Si el correo existe, te reenviamos el enlace de confirmación.');
              } catch (error) {
                console.error('[ForgotPassword] resend confirmation error', error);
                setErrorMessage(error instanceof Error ? mapAuthErrorMessage(error.message) : 'No pudimos reenviar el correo de confirmación.');
              } finally {
                setLoadingResend(false);
              }
            }}
          >
            {loadingResend ? 'Reenviando...' : 'Reenviar correo de confirmación'}
          </Button>
        </div>
      </div>

      {formState.errors.email && <p className="text-xs text-red-500">{formState.errors.email.message}</p>}
      {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}
      {message && <p className="rounded-md bg-emerald-50 p-2 text-xs text-emerald-700">{message}</p>}

      <Link href="/login" className="text-sm">Volver a iniciar sesión</Link>
    </Card>
  );
}
