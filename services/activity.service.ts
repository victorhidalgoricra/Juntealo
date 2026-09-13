import { hasSupabase } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import type { UserActivityEvent } from '@/types/domain';

export type InviteInteractionEvent =
  | 'invite_link_copied'
  | 'access_code_copied'
  | 'whatsapp_share_clicked';

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

export async function recordInviteInteraction(params: {
  juntaId: string;
  eventType: InviteInteractionEvent;
  source?: string;
}) {
  if (!hasSupabase || !supabase) return { ok: true as const };
  const { error } = await supabase.schema('public').rpc('record_junta_invite_interaction', {
    p_junta_id: params.juntaId,
    p_event_type: params.eventType,
    p_source: params.source ?? 'junta_detail'
  });
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const };
}

export async function recordSignupFromInvite(params: { juntaId: string; inviteToken: string }) {
  if (!hasSupabase || !supabase) return { ok: true as const };
  const { error } = await supabase.schema('public').rpc('record_signup_from_junta_invite', {
    p_junta_id: params.juntaId,
    p_invite_token: params.inviteToken
  });
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const };
}
