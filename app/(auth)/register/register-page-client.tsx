'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { registerSchema } from '@/features/auth/schemas';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { hasSupabase } from '@/lib/env';
import { mapRegisterErrorMessage } from '@/services/auth.service';
import { useState } from 'react';
import { checkProfileConflicts, ensureProfileExists } from '@/services/profile.service';

type RegisterFormValues = z.infer<typeof registerSchema>;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[11px] text-destructive">{message}</p>;
}

export function RegisterPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const { register, handleSubmit, setError, formState } = useForm<RegisterFormValues>();
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <Card className="w-full space-y-5 p-6 sm:p-7">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-fg">Crea tu cuenta</h1>
        <p className="text-sm text-muted">Regístrate para crear y unirte a juntas digitales.</p>
      </div>
      <form
        className="space-y-4"
        onSubmit={handleSubmit(async (values) => {
          setAuthError(null);
          const parsed = registerSchema.safeParse(values);
          if (!parsed.success) {
            const issue = parsed.error.issues[0];
            setError(issue.path[0] as 'nombre' | 'dni' | 'celular' | 'email' | 'password', { message: issue.message });
            return;
          }

          try {
            setLoading(true);
            const normalized = parsed.data;
            if (hasSupabase && supabase) {
              const conflictCheck = await checkProfileConflicts({ dni: normalized.dni, celular: normalized.celular });
              if (!conflictCheck.ok) throw new Error(conflictCheck.message);
              if (conflictCheck.existsDni) {
                setError('dni', { message: 'No puedes registrarte. Este DNI ya está registrado.' });
                return;
              }
              if (conflictCheck.existsCelular) {
                setError('celular', { message: 'Este celular ya está registrado.' });
                return;
              }

              const emailRedirectTo = `${window.location.origin}/login?confirmed=1`;
              const { data, error } = await supabase.auth.signUp({
                email: normalized.email,
                password: normalized.password,
                options: {
                  data: { full_name: normalized.nombre, phone: normalized.celular, dni: normalized.dni },
                  emailRedirectTo
                }
              });
              if (error) throw error;

              const user = data.user;

              if (user && (user.identities ?? []).length === 0) {
                setAuthError('Este correo ya está registrado. Inicia sesión o recupera tu contraseña.');
                return;
              }

              if (!user) throw new Error('No se pudo crear el usuario en autenticación.');

              const requiresEmailConfirmation = !data.session;

              if (!requiresEmailConfirmation) {
                const profileSync = await ensureProfileExists({
                  id: user.id,
                  email: normalized.email,
                  nombre: normalized.nombre,
                  celular: normalized.celular,
                  dni: normalized.dni
                });
                if (!profileSync.ok) throw new Error(`profile_sync_failed: ${profileSync.message}`);

                try {
                  await supabase.auth.signOut();
                } catch {
                  // no-op defensivo: igual redirigimos al login
                }
              }

              const signupState = requiresEmailConfirmation ? 'confirm_email' : 'success';
              router.replace(`/login?signup=${signupState}&redirect=${encodeURIComponent(redirect)}`);
              return;
            }

            router.replace(`/login?signup=success&redirect=${encodeURIComponent(redirect)}`);
          } catch (error) {
            const rawMsg = error instanceof Error ? error.message : String(error);
            console.error('[Register] signUp error', rawMsg, error);
            setAuthError(mapRegisterErrorMessage(rawMsg));
          } finally {
            setLoading(false);
          }
        })}
      >
        <div className="space-y-1.5">
          <label className="text-[13px] font-semibold text-fg">Nombre completo</label>
          <Input placeholder="Nombre y apellido" {...register('nombre')} />
          <FieldError message={formState.errors.nombre?.message} />
        </div>
        <div className="space-y-1.5">
          <label className="text-[13px] font-semibold text-fg">DNI</label>
          <Input placeholder="12345678" inputMode="numeric" autoComplete="off" {...register('dni')} />
          <FieldError message={formState.errors.dni?.message} />
        </div>
        <div className="space-y-1.5">
          <label className="text-[13px] font-semibold text-fg">Celular</label>
          <Input placeholder="987654321" inputMode="tel" autoComplete="tel" {...register('celular')} />
          <FieldError message={formState.errors.celular?.message} />
        </div>
        <div className="space-y-1.5">
          <label className="text-[13px] font-semibold text-fg">Correo</label>
          <Input placeholder="correo@ejemplo.com" autoComplete="email" {...register('email')} />
          <FieldError message={formState.errors.email?.message} />
        </div>
        <div className="space-y-1.5">
          <label className="text-[13px] font-semibold text-fg">Contraseña</label>
          <Input placeholder="Mínimo 8 caracteres" type="password" autoComplete="new-password" {...register('password')} />
          <FieldError message={formState.errors.password?.message} />
        </div>
        {authError && <FieldError message={authError} />}
        <Button className="w-full" disabled={loading}>{loading ? 'Creando cuenta...' : 'Crear cuenta'}</Button>
        <Link className="text-sm text-muted hover:text-fg hover:underline" href={`/login?redirect=${encodeURIComponent(redirect)}`}>
          Ya tengo cuenta
        </Link>
      </form>
    </Card>
  );
}
