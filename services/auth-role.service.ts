import { env, hasSupabase } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { GlobalRole, Profile } from '@/types/domain';

export async function resolveGlobalRole(email: string): Promise<GlobalRole> {
  const normalized = email.toLowerCase();

  if (env.mockAdminEmails.includes(normalized)) return 'admin';

  if (!hasSupabase || !supabase) return 'user';

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,global_role')
    .eq('email', normalized)
    .maybeSingle();
  if (!profile?.id) return 'user';

  // Use global_role stored directly in profiles when available
  if (profile.global_role === 'backoffice_admin') return 'backoffice_admin';
  if (profile.global_role === 'admin') return 'admin';

  // Fallback: check user_global_roles table
  const { data: roleRow } = await supabase
    .from('user_global_roles')
    .select('role')
    .eq('profile_id', profile.id)
    .in('role', ['admin', 'backoffice_admin'])
    .maybeSingle();

  if (roleRow?.role === 'backoffice_admin') return 'backoffice_admin';
  return roleRow?.role === 'admin' ? 'admin' : 'user';
}

export function isBackofficeAdmin(user: Pick<Profile, 'global_role'> | null | undefined) {
  return user?.global_role === 'backoffice_admin' || user?.global_role === 'admin';
}
