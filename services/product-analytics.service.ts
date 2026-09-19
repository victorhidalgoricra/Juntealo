import { hasSupabase } from '@/lib/env';
import { supabase } from '@/lib/supabase';

export type ClientProductEventName =
  | 'junta_creation_started'
  | 'junta_activation_started'
  | 'payment_started'
  | 'explore_viewed'
  | 'junta_viewed'
  | 'create_junta_cta_clicked'
  | 'join_junta_cta_clicked'
  | 'junta_invite_link_opened';

type MetadataValue = string | number | boolean | null;

const prohibitedMetadataKeys = new Set([
  'name', 'nombre', 'email', 'phone', 'telefono', 'celular', 'dni', 'address',
  'direccion', 'bank_account', 'cuenta_bancaria', 'otp', 'junta_name', 'title',
  'message', 'content'
]);

export function sanitizeProductEventMetadata(metadata: Record<string, MetadataValue> = {}) {
  return Object.fromEntries(
    Object.entries(metadata).filter(([key, value]) =>
      !prohibitedMetadataKeys.has(key.toLowerCase()) &&
      (value === null || ['string', 'number', 'boolean'].includes(typeof value))
    )
  );
}

export async function trackProductEvent(params: {
  eventName: ClientProductEventName;
  juntaId?: string;
  paymentId?: string;
  cycleId?: string;
  inviteId?: string;
  eventKey?: string;
  metadata?: Record<string, MetadataValue>;
}) {
  if (!hasSupabase || !supabase) return { ok: true as const, skipped: true as const };

  const source = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
    ? 'mobile_web'
    : 'web';
  const { error } = await supabase.schema('public').rpc('track_product_event', {
    p_event_name: params.eventName,
    p_junta_id: params.juntaId ?? null,
    p_payment_id: params.paymentId ?? null,
    p_cycle_id: params.cycleId ?? null,
    p_invite_id: params.inviteId ?? null,
    p_source: source,
    p_metadata: sanitizeProductEventMetadata(params.metadata),
    p_event_key: params.eventKey ?? null
  });

  if (error) {
    // Product analytics must never interrupt the UX flow.
    if (process.env.NODE_ENV === 'development') {
      console.warn('[product-analytics] event was not recorded', params.eventName, error.message);
    }
    return { ok: false as const, message: error.message };
  }
  return { ok: true as const };
}

