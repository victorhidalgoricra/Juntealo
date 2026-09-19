import { hasSupabase } from '@/lib/env';
import { supabase } from '@/lib/supabase';

const VISITOR_KEY = 'juntealo-anonymous-visitor-id';
const FIRST_TOUCH_KEY = 'juntealo-first-touch-attribution';

export type AcquisitionSource = 'direct' | 'invite' | 'organic_search' | 'paid' | 'referral' | 'unknown';

type StoredAttribution = {
  visitorId: string;
  attributionId?: string;
  inviteId?: string;
  source: AcquisitionSource;
  utmSource?: string;
  medium?: string;
  campaign?: string;
};

export function normalizeCampaignValue(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 100);
  return normalized && /^[a-z0-9][a-z0-9._-]{0,99}$/.test(normalized) ? normalized : undefined;
}

function storageAvailable() {
  return typeof window !== 'undefined';
}

export function getAnonymousVisitorId() {
  if (!storageAvailable()) return undefined;
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
    const created = crypto.randomUUID();
    window.localStorage.setItem(VISITOR_KEY, created);
    return created;
  } catch {
    return undefined;
  }
}

export function readFirstTouchAttribution(): StoredAttribution | undefined {
  if (!storageAvailable()) return undefined;
  try {
    const value = JSON.parse(window.localStorage.getItem(FIRST_TOUCH_KEY) ?? 'null') as StoredAttribution | null;
    return value?.visitorId && value.source ? value : undefined;
  } catch {
    return undefined;
  }
}

function saveFirstTouchAttribution(value: StoredAttribution) {
  if (!storageAvailable() || readFirstTouchAttribution()) return;
  try {
    window.localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(value));
  } catch {
    // Attribution is best effort and must never interrupt signup or navigation.
  }
}

export async function captureInviteOpen(params: {
  token: string;
  utmSource?: string;
  medium?: string;
  campaign?: string;
}) {
  const visitorId = getAnonymousVisitorId();
  if (!visitorId || !hasSupabase || !supabase) return { ok: false as const };
  const medium = normalizeCampaignValue(params.medium);
  const utmSource = normalizeCampaignValue(params.utmSource);
  const campaign = normalizeCampaignValue(params.campaign);
  const { data, error } = await supabase.schema('public').rpc('open_junta_invite', {
    p_token: params.token,
    p_anonymous_visitor_id: visitorId,
    p_utm_source: utmSource ?? null,
    p_acquisition_medium: medium ?? null,
    p_acquisition_campaign: campaign ?? null
  });
  const result = data as {
    ok?: boolean;
    attribution_id?: string;
    invite_id?: string;
    is_first_touch?: boolean;
  } | null;
  if (error || !result?.ok) return { ok: false as const };
  if (result.is_first_touch && result.attribution_id && result.invite_id) {
    saveFirstTouchAttribution({
      visitorId,
      attributionId: result.attribution_id,
      inviteId: result.invite_id,
      source: 'invite',
      utmSource,
      medium: medium ?? 'shared_link',
      campaign
    });
  }
  return { ok: true as const };
}

export function resolveFirstTouchAttribution(params?: { referralPresent?: boolean }) {
  const stored = readFirstTouchAttribution();
  if (stored) return stored;
  const visitorId = getAnonymousVisitorId() ?? crypto.randomUUID();
  const search = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const medium = normalizeCampaignValue(search.get('utm_medium'));
  const campaign = normalizeCampaignValue(search.get('utm_campaign'));
  const sourceParam = normalizeCampaignValue(search.get('utm_source'));
  const paidMedium = /^(cpc|ppc|paid|paid_search|display|social_paid)$/i.test(medium ?? '');
  const referrer = typeof document !== 'undefined' ? document.referrer : '';
  let referrerHost = '';
  try { referrerHost = referrer ? new URL(referrer).hostname : ''; } catch { referrerHost = ''; }
  const organic = /(^|\.)(google|bing|duckduckgo|yahoo)\./i.test(referrerHost);
  const source: AcquisitionSource = params?.referralPresent
    ? 'referral'
    : paidMedium
      ? 'paid'
      : organic
        ? 'organic_search'
        : sourceParam || medium
          ? 'unknown'
          : referrer
            ? 'unknown'
            : 'direct';
  const value: StoredAttribution = { visitorId, source, utmSource: sourceParam, medium, campaign };
  saveFirstTouchAttribution(value);
  return value;
}

export async function claimStoredInviteAttribution() {
  const attribution = readFirstTouchAttribution();
  if (!attribution?.attributionId || !hasSupabase || !supabase) return { ok: true as const, skipped: true as const };
  const { error } = await supabase.schema('public').rpc('claim_invite_attribution', {
    p_attribution_id: attribution.attributionId,
    p_anonymous_visitor_id: attribution.visitorId
  });
  return error ? { ok: false as const, message: error.message } : { ok: true as const };
}
