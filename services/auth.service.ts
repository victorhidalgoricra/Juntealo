export function mapAuthErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('email not confirmed')) return 'Debes confirmar tu correo antes de ingresar.';
  if (normalized.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (normalized.includes('user already registered') || normalized.includes('already been registered')) {
    return 'Este correo ya está registrado.';
  }
  if (normalized.includes('profiles_dni_unique_digits_idx') || normalized.includes('dni_format_chk') || normalized.includes('dni')) {
    return 'Este DNI ya está registrado.';
  }
  if (normalized.includes('profiles_celular_unique_digits_idx') || normalized.includes('celular')) {
    return 'Este celular ya está registrado.';
  }
  if (normalized.includes('database error saving new user')) {
    return 'No pudimos crear tu perfil. Verifica DNI/celular e intenta nuevamente.';
  }
  if (normalized.includes('smtp') || normalized.includes('email provider')) {
    return 'No pudimos enviar el correo. Revisa la configuración de correo en Supabase.';
  }

  return 'Ocurrió un error de autenticación. Intenta nuevamente.';
}

export function mapRegisterErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('check_profile_conflicts')) {
    return 'No pudimos validar tu DNI en este momento. Intenta nuevamente en unos segundos.';
  }

  if (normalized.includes('el dni es obligatorio')) return 'Debes ingresar un DNI válido para registrarte.';
  if (normalized.includes('el celular es obligatorio')) return 'Debes ingresar un celular válido para registrarte.';

  return mapAuthErrorMessage(message);
}
