import { hasSupabase } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import type { UserActivityEvent } from '@/types/domain';

export async function fetchRecentUserActivity(limit = 5) {
  if (!hasSupabase || !supabase) return { ok: true as const, data: [] as UserActivityEvent[] };
  const { data, error } = await supabase
    .schema('public')
    .from('user_activity_events')
    .select('id,profile_id,event_type,junta_id,payment_id,description,metadata,occurred_at')
    .order('occurred_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 5));
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const, data: (data ?? []) as UserActivityEvent[] };
}
