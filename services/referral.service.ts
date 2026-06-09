import { supabase } from '@/lib/supabase';
import { hasSupabase } from '@/lib/env';

export type ReferralValidation =
  | { exists: true; referrerNombre: string }
  | { exists: false };

export type ReferralStats = {
  total: number;
  active: number;
};

export async function validateReferralCode(code: string): Promise<ReferralValidation> {
  if (!hasSupabase || !supabase || !code.trim()) return { exists: false };

  const { data, error } = await supabase.rpc('validate_referral_code', { p_code: code.trim() });
  if (error || !data) return { exists: false };

  const result = data as { exists: boolean; referrer_nombre?: string };
  if (!result.exists) return { exists: false };
  return { exists: true, referrerNombre: result.referrer_nombre ?? '' };
}

export async function useReferralCode(code: string): Promise<{ ok: boolean; error?: string }> {
  if (!hasSupabase || !supabase || !code.trim()) return { ok: false, error: 'no_code' };

  const { data, error } = await supabase.rpc('use_referral_code', { p_referral_code: code.trim() });
  if (error) {
    console.error('[useReferralCode] RPC error:', error);
    return { ok: false, error: error.message };
  }

  const result = data as { ok: boolean; error?: string };
  return { ok: result.ok, error: result.error };
}

export async function fetchReferralStats(profileId: string): Promise<ReferralStats> {
  if (!hasSupabase || !supabase) return { total: 0, active: 0 };

  const { data, error } = await supabase.rpc('get_referral_stats', { p_profile_id: profileId });
  if (error || !data) return { total: 0, active: 0 };

  const result = data as { total: number; active: number };
  return {
    total: Number(result.total ?? 0),
    active: Number(result.active ?? 0)
  };
}
