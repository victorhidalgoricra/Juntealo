import type { User } from '@supabase/supabase-js';
import { resolveGlobalRole } from '@/services/auth-role.service';
import { fetchProfileById } from '@/services/profile.service';
import { Profile } from '@/types/domain';

export async function buildProfileFromAuthUser(user: User, fallbackEmail?: string): Promise<Profile> {
  const email = user.email ?? fallbackEmail ?? '';
  const profileResult = await fetchProfileById(user.id);
  if (!profileResult.ok) {
    console.warn('[Auth] profile lookup failed, continuing with auth payload', profileResult.message);
  }

  const profile = profileResult.ok ? profileResult.data : null;
  const globalRole = await resolveGlobalRole(email);

  return {
    id: user.id,
    email: profile?.email ?? email,
    nombre: profile?.nombre ?? user.user_metadata?.full_name ?? email.split('@')[0] ?? 'Usuario',
    first_name: profile?.first_name,
    second_name: profile?.second_name,
    paternal_last_name: profile?.paternal_last_name,
    celular: profile?.celular ?? user.user_metadata?.phone ?? '',
    dni: profile?.dni ?? user.user_metadata?.dni,
    foto_url: profile?.foto_url,
    preferred_payout_method: profile?.preferred_payout_method,
    payout_account_name: profile?.payout_account_name,
    payout_phone_number: profile?.payout_phone_number,
    payout_bank_name: profile?.payout_bank_name,
    payout_account_number: profile?.payout_account_number,
    payout_cci: profile?.payout_cci,
    payout_notes: profile?.payout_notes,
    global_role: globalRole
  };
}

function getNormalizedMessage(errorOrMessage: unknown) {
  if (typeof errorOrMessage === 'string') return errorOrMessage.toLowerCase();
  if (errorOrMessage instanceof Error) return errorOrMessage.message.toLowerCase();
  return '';
}

export function mapAuthErrorMessage(message: string) {
  const normalized = getNormalizedMessage(message);

  if (normalized.includes('email not confirmed')) return 'Debes confirmar tu correo antes de ingresar.';
  if (normalized.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (normalized.includes('user already registered') || normalized.includes('already been registered')) {
    return 'Este correo ya está registrado. Inicia sesión o recupera tu contraseña.';
  }

  if (
    normalized.includes('profiles_dni_unique_digits_idx')
    || normalized.includes('duplicate key value') && normalized.includes('dni')
    || normalized.includes('dni_format_chk')
    || normalized.includes('el dni es obligatorio')
  ) {
    return 'Este DNI ya está registrado.';
  }

  if (
    normalized.includes('profiles_celular_unique_digits_idx')
    || normalized.includes('duplicate key value') && normalized.includes('celular')
    || normalized.includes('el celular es obligatorio')
  ) {
    return 'Este celular ya está registrado.';
  }

  if (normalized.includes('database error saving new user') || normalized.includes('database error')) {
    return 'Error al guardar en la base de datos. Intenta nuevamente.';
  }

  if (normalized.includes('error sending confirmation email')) {
    return 'No se pudo enviar el correo de confirmación. Intenta nuevamente en unos minutos.';
  }

  if (normalized.includes('smtp') || normalized.includes('email provider')) {
    return 'No pudimos enviar el correo. Revisa la configuración de correo en Supabase.';
  }

  if (normalized.includes('password should be') || normalized.includes('password must be') || normalized.includes('weak password')) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }

  if (normalized.includes('auth session missing') || normalized.includes('session_not_found') || normalized.includes('no active session')) {
    return 'El enlace expiró o ya fue usado. Solicita un nuevo enlace de recuperación.';
  }

  if (normalized.includes('token has expired') || normalized.includes('otp expired') || normalized.includes('expired')) {
    return 'El enlace de recuperación expiró. Solicita uno nuevo.';
  }

  return message || 'No se pudo completar la autenticación. Intenta nuevamente.';
}

export function mapRegisterErrorMessage(message: string) {
  const normalized = getNormalizedMessage(message);

  if (normalized.includes('check_profile_conflicts')) {
    return 'No pudimos validar tus datos en este momento. Intenta nuevamente en unos segundos.';
  }

  if (normalized.includes('profile_sync_failed')) {
    return 'Hubo un problema creando tu perfil. Intenta nuevamente.';
  }

  if (normalized.includes('invalid') || normalized.includes('validation')) {
    return 'Datos inválidos. Revisa la información ingresada.';
  }

  return mapAuthErrorMessage(message);
}
