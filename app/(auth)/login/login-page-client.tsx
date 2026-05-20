'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { loginSchema } from '@/features/auth/schemas';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { resolveGlobalRole } from '@/services/auth-role.service';
import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { hasSupabase } from '@/lib/env';
import { buildProfileFromAuthUser, mapAuthErrorMessage } from '@/services/auth.service';
import { ensureProfileExists, fetchProfileById } from '@/services/profile.service';
import { clearExploreJoinIntent, readExploreJoinIntent } from '@/lib/explore-join-intent';
import { fetchMyActiveMembership } from '@/services/juntas.repository';

type LoginFormValues = z.infer<typeof loginSchema>;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[11px] text-destructive">{message}</p>;
}

export function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const confirmedParam = searchParams.get('confirmed');
  const signupParam = searchParams.get('signup');
  const setUser = useAuthStore((s) => s.setUser);
  const { register, handleSubmit, formState, setError } = useForm<LoginFormValues>();
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const confirmedMsg = useMemo(() => (confirmedParam ? 'Tu correo fue confirmado. Ya puedes iniciar sesión.' : null), [confirmedParam]);
  const signupMsg = useMemo(() => {
    if (signupParam === 'confirm_email') {
      return 'Te enviamos un correo de confirmación. Revisa tu bandeja de entrada antes de ingresar.';
    }
    if (signupParam === 'success') {
      return 'Tu cuenta fue creada correctamente. Ahora puedes iniciar sesión.';
    }
    return null;
  }, [signupParam]);

  const resolvePostLoginRoute = async (params: { profileId: string; fallbackRedirect: string }) => {
    const intent = readExploreJoinIntent();
    if (!intent?.juntaId) return params.fallbackRedirect;

    const membershipResult = await fetchMyActiveMembership({
      juntaId: intent.juntaId,
      profileId: params.profileId
    });

    clearExploreJoinIntent();
    if (!membershipResult.ok) return '/juntas';
    if (membershipResult.isActiveMember) return `/juntas/${intent.juntaId}`;
    return '/juntas';
  };

  const onSubmit = handleSubmit(async (values) => {
    setAuthError(null);
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(issue.path[0] as 'email' | 'password', { message: issue.message });
      return;
    }

    try {
      setLoading(true);
      if (hasSupabase && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email: values.email, password: values.password });
        if (error) throw error;
        const user = data.user;
        if (!user) throw new Error('No se pudo obtener sesión.');

        const profileResult = await fetchProfileById(user.id);
        if (!profileResult.ok) {
          console.warn('[Login] profile lookup failed, continuing with auth payload', profileResult.message);
        }

        if (profileResult.ok && !profileResult.data) {
          const ensureResult = await ensureProfileExists({
            id: user.id,
            email: values.email,
            nombre: user.user_metadata?.full_name ?? values.email.split('@')[0],
            celular: user.user_metadata?.phone,
            dni: user.user_metadata?.dni
          });
          if (!ensureResult.ok) {
            console.warn('[Login] profile ensure failed, continuing with auth payload', ensureResult.message);
          }
        }

        setUser(await buildProfileFromAuthUser(user, values.email));
        const nextPath = await resolvePostLoginRoute({
          profileId: user.id,
          fallbackRedirect: redirect
        });

        router.replace(nextPath);
        return;
      }

      const globalRole = await resolveGlobalRole(values.email);
      const offlineUserId = crypto.randomUUID();
      setUser({ id: offlineUserId, email: values.email, nombre: values.email.split('@')[0], celular: '', global_role: globalRole });
      const nextPath = await resolvePostLoginRoute({
        profileId: offlineUserId,
        fallbackRedirect: redirect
      });
      router.replace(nextPath);
    } catch (error) {
      console.error('[Login] auth error', error);
      setAuthError(error instanceof Error ? mapAuthErrorMessage(error.message) : 'No se pudo iniciar sesión en este momento.');
    } finally {
      setLoading(false);
    }
  });

  return (
    <Card className="w-full max-w-md space-y-5 p-6 sm:p-7">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-fg">Iniciar sesión</h1>
        <p className="text-sm text-muted">Ingresa para gestionar tus juntas de forma segura.</p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-1.5">
          <label className="text-[13px] font-semibold text-fg">Correo</label>
          <Input placeholder="correo@ejemplo.com" autoComplete="email" {...register('email')} />
          <FieldError message={formState.errors.email?.message} />
        </div>

        <div className="space-y-1.5">
          <label className="text-[13px] font-semibold text-fg">Contraseña</label>
          <Input placeholder="Tu contraseña" type="password" autoComplete="current-password" {...register('password')} />
          <FieldError message={formState.errors.password?.message} />
        </div>

        {authError && <FieldError message={authError} />}
        {signupMsg && <p className="rounded-[var(--r-sm)] bg-green-bg p-2.5 text-[11px] text-green">{signupMsg}</p>}
        {confirmedMsg && <p className="rounded-[var(--r-sm)] bg-green-bg p-2.5 text-[11px] text-green">{confirmedMsg}</p>}

        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? 'Ingresando...' : 'Entrar'}
        </Button>

        <div className="flex flex-col gap-2 pt-1 text-sm">
          <Link className="text-muted hover:text-fg hover:underline" href={`/register?redirect=${encodeURIComponent(redirect)}`}>
            Crear cuenta
          </Link>
          <Link className="text-muted hover:text-fg hover:underline" href="/forgot-password">
            Olvidé mi contraseña
          </Link>
        </div>
      </form>
    </Card>
  );
}
