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

export type DashboardPeriodDays = 7 | 30 | 90;

export type DashboardMetric = {
  current: number | null;
  previous: number | null;
};

export function calculateFunnelRate(stageCount: number, createdCount: number) {
  if (!Number.isFinite(stageCount) || !Number.isFinite(createdCount) || createdCount <= 0) return null;
  return Math.min(100, Math.max(0, (stageCount / createdCount) * 100));
}

export type MaturityRate = {
  eligible: number;
  achieved: number;
  rate: number | null;
};

export type ComparedMaturityRate = {
  current: MaturityRate;
  previous: MaturityRate;
};

export type ComparedRepeatMaturityRate = {
  current: { eligibleUsers: number; repeatedUsers: number; rate: number | null };
  previous: { eligibleUsers: number; repeatedUsers: number; rate: number | null };
};

export function evaluateWithinWindow(
  startedAt: string,
  achievedAt: string | null,
  now: string,
  windowDays: number
) {
  const start = new Date(startedAt).getTime();
  const end = achievedAt === null ? null : new Date(achievedAt).getTime();
  const observedAt = new Date(now).getTime();
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const eligible = Number.isFinite(start) && Number.isFinite(observedAt) && start <= observedAt - windowMs;
  return { eligible, achieved: eligible && end !== null && end >= start && end <= start + windowMs };
}

export function calculateMaturityRate(achieved: number, eligible: number) {
  if (!Number.isFinite(achieved) || !Number.isFinite(eligible) || eligible <= 0) return null;
  return Math.min(100, Math.max(0, (achieved / eligible) * 100));
}

export function evaluateRepeatWithinWindow(params: {
  completedJuntaId: string;
  completedAt: string;
  now: string;
  windowDays: number;
  joins: Array<{ juntaId: string; occurredAt: string }>;
}) {
  const maturity = evaluateWithinWindow(params.completedAt, null, params.now, params.windowDays);
  const completedAt = new Date(params.completedAt).getTime();
  const deadline = completedAt + params.windowDays * 24 * 60 * 60 * 1000;
  const achieved = maturity.eligible && params.joins.some((join) => {
    const joinedAt = new Date(join.occurredAt).getTime();
    return join.juntaId !== params.completedJuntaId && joinedAt > completedAt && joinedAt <= deadline;
  });
  return { eligible: maturity.eligible, achieved };
}

export function getRepeatMaturityWindows(now: string, periodDays: DashboardPeriodDays) {
  const end = new Date(now).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const currentEnd = end - 30 * dayMs;
  const currentStart = currentEnd - periodDays * dayMs;
  const previousEnd = currentStart;
  const previousStart = previousEnd - periodDays * dayMs;
  return { current: { start: currentStart, end: currentEnd }, previous: { start: previousStart, end: previousEnd } };
}

export function repeatMaturityCohort(completedAt: string, now: string, periodDays: DashboardPeriodDays) {
  const completion = new Date(completedAt).getTime();
  const windows = getRepeatMaturityWindows(now, periodDays);
  if (completion >= windows.current.start && completion < windows.current.end) return 'current' as const;
  if (completion >= windows.previous.start && completion < windows.previous.end) return 'previous' as const;
  return null;
}

export type ProductDashboardData = {
  period: {
    days: DashboardPeriodDays;
    start: string;
    end: string;
    previousStart: string;
    granularity: 'day' | 'week';
    analyticsCompleteSince: string | null;
  };
  kpis: {
    activeSavers: DashboardMetric;
    juntasWithMovement: DashboardMetric;
    confirmedVolume: DashboardMetric;
    activationRate: DashboardMetric;
    activationWithin7d: ComparedMaturityRate;
    onTimePaymentRate: DashboardMetric;
  };
  funnel: {
    created: number;
    first_member: number;
    filled: number;
    activated: number;
    first_payment: number;
    completed: number;
    open_in_progress: number;
    median_age_days: number | null;
    median_hours_to_fill: number | null;
    median_hours_to_activation: number | null;
  };
  evolution: Array<{
    date: string;
    activeSavers: number;
    volume: number;
    juntasWithMovement: number;
  }>;
  health: {
    repeatJuntaRate: number | null;
    repeatWithin30d: ComparedRepeatMaturityRate;
    retentionRate: number | null;
    medianDaysToNextJunta: number | null;
    fillRate: number | null;
    fillWithin7d: ComparedMaturityRate;
    medianHoursToFill: number | null;
    uncompletedJuntas: number;
    inviteConversion: number | null;
    invitesPerInviter: number | null;
    kFactor: number | null;
  };
  attention: {
    pending_validation: number;
    stale_unfilled: number;
    overdue_payments: number;
  };
  config: {
    staleJuntaDays: number;
  };
  dataQualityIssues: number;
};

export async function fetchProductDashboard(days: DashboardPeriodDays) {
  if (!hasSupabase || !supabase) {
    return { ok: false as const, message: 'Supabase no está configurado.' };
  }

  const { data, error } = await supabase.schema('public').rpc('admin_product_dashboard', {
    p_days: days
  });

  if (error) return { ok: false as const, message: error.message };
  if (!data || typeof data !== 'object') {
    return { ok: false as const, message: 'El dashboard no devolvió datos.' };
  }

  return { ok: true as const, data: data as unknown as ProductDashboardData };
}
