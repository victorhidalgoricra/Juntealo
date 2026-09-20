import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  calculateFunnelRate,
  calculateMaturityRate,
  evaluateRepeatWithinWindow,
  evaluateWithinWindow,
  getRepeatMaturityWindows,
  repeatMaturityCohort,
  sanitizeProductEventMetadata
} from '@/services/product-analytics.service';
import { normalizeCampaignValue } from '@/lib/acquisition-attribution';

describe('product analytics metadata', () => {
  it('keeps analytics dimensions and removes PII/free text fields', () => {
    expect(sanitizeProductEventMetadata({
      entry_point: 'create_page',
      reminder_sequence: 2,
      email: 'private@example.com',
      dni: '12345678',
      junta_name: 'texto libre'
    })).toEqual({ entry_point: 'create_page', reminder_sequence: 2 });
  });
});

describe('defensible dashboard metrics', () => {
  const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/090_defensible_product_dashboard_metrics.sql'), 'utf8');

  it('keeps funnel rates finite, empty without a denominator, and at most 100%', () => {
    expect(calculateFunnelRate(3, 0)).toBeNull();
    expect(calculateFunnelRate(15, 10)).toBe(100);
    expect(calculateFunnelRate(8, 10)).toBe(80);
  });

  it('builds the funnel from creation-cohort junta ids rather than in-period stage events', () => {
    expect(sql).toContain("where e.event_type = 'junta_created'");
    expect(sql).toContain('from public.juntas j join current_cohort c on c.junta_id=j.id');
    expect(sql).toContain("e.event_type='junta_activated' and e.occurred_at>=c.created_at");
  });

  it('requires repeat joins to be later and for a different junta', () => {
    expect(sql).toContain('e.junta_id<>d.completed_junta_id');
    expect(sql).toContain('e.occurred_at>d.completed_at');
  });

  it('uses null-safe denominators for funnel and repeat rates', () => {
    expect(sql).toContain('100.0*filled/nullif(created,0)');
    expect(sql).toContain("100.0*count(*) filter(where next_join_at is not null)/nullif(count(*),0)");
  });
});

describe('maturity-window metrics', () => {
  const now = '2026-09-30T00:00:00.000Z';
  const maturitySql = readFileSync(resolve(process.cwd(), 'supabase/migrations/091_maturity_adjusted_product_metrics.sql'), 'utf8');

  it('counts activation and fill achieved within seven days', () => {
    expect(evaluateWithinWindow('2026-09-01T00:00:00.000Z', '2026-09-05T00:00:00.000Z', now, 7)).toEqual({ eligible: true, achieved: true });
  });

  it('keeps a mature junta eligible but unsuccessful after seven days', () => {
    expect(evaluateWithinWindow('2026-09-01T00:00:00.000Z', '2026-09-12T00:00:00.000Z', now, 7)).toEqual({ eligible: true, achieved: false });
  });

  it('excludes juntas with fewer than seven complete observation days', () => {
    expect(evaluateWithinWindow('2026-09-27T00:00:00.000Z', '2026-09-29T00:00:00.000Z', now, 7)).toEqual({ eligible: false, achieved: false });
  });

  it('counts only a different junta joined within 30 days after completion', () => {
    const base = { completedJuntaId: 'first', completedAt: '2026-08-01T00:00:00.000Z', now, windowDays: 30 };
    expect(evaluateRepeatWithinWindow({ ...base, joins: [{ juntaId: 'next', occurredAt: '2026-08-20T00:00:00.000Z' }] })).toEqual({ eligible: true, achieved: true });
    expect(evaluateRepeatWithinWindow({ ...base, joins: [{ juntaId: 'next', occurredAt: '2026-09-10T00:00:00.000Z' }] })).toEqual({ eligible: true, achieved: false });
    expect(evaluateRepeatWithinWindow({ ...base, joins: [{ juntaId: 'first', occurredAt: '2026-08-20T00:00:00.000Z' }] })).toEqual({ eligible: true, achieved: false });
    expect(evaluateRepeatWithinWindow({ ...base, joins: [{ juntaId: 'next', occurredAt: '2026-07-20T00:00:00.000Z' }] })).toEqual({ eligible: true, achieved: false });
  });

  it('excludes repeat users without 30 complete observation days', () => {
    expect(evaluateRepeatWithinWindow({ completedJuntaId: 'first', completedAt: '2026-09-20T00:00:00.000Z', now, windowDays: 30, joins: [] })).toEqual({ eligible: false, achieved: false });
  });

  it('returns null rather than zero or a non-finite rate without an eligible cohort', () => {
    expect(calculateMaturityRate(0, 0)).toBeNull();
  });

  it('keeps maturity eligibility and success windows in the RPC', () => {
    expect(maturitySql).toContain('j.created_at <= v_now-make_interval(days => v_maturity_days)');
    expect(maturitySql).toContain('j.first_filled_at <= j.created_at+make_interval(days => v_maturity_days)');
    expect(maturitySql).toContain('j.activated_at <= j.created_at+make_interval(days => v_maturity_days)');
    expect(maturitySql).toContain('cp.completed_at<=v_now-make_interval(days => v_repeat_window_days)');
    expect(maturitySql).toContain('e.occurred_at<=r.completed_at+make_interval(days => v_repeat_window_days)');
  });
});

describe('Repeat ≤30d shifted maturity cohorts', () => {
  const now = '2026-09-30T00:00:00.000Z';
  const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/092_repeat_30d_mature_cohort.sql'), 'utf8');

  it('assigns a completion 45 days ago to the current 30-day cohort', () => {
    expect(repeatMaturityCohort('2026-08-16T00:00:00.000Z', now, 30)).toBe('current');
  });

  it('excludes a completion only 20 days old', () => {
    expect(repeatMaturityCohort('2026-09-10T00:00:00.000Z', now, 30)).toBeNull();
  });

  it('assigns a completion 70 days ago to the previous 30-day cohort', () => {
    expect(repeatMaturityCohort('2026-07-22T00:00:00.000Z', now, 30)).toBe('previous');
  });

  it('uses current and previous windows of equal duration', () => {
    for (const days of [7, 30, 90] as const) {
      const windows = getRepeatMaturityWindows(now, days);
      expect(windows.current.end - windows.current.start).toBe(days * 24 * 60 * 60 * 1000);
      expect(windows.previous.end - windows.previous.start).toBe(days * 24 * 60 * 60 * 1000);
      expect(windows.previous.end).toBe(windows.current.start);
    }
  });

  it('applies shifted half-open windows and the 30-day success deadline in SQL', () => {
    expect(sql).toContain('v_current_end := v_now - make_interval(days => v_repeat_window_days)');
    expect(sql).toContain('v_current_start := v_current_end - make_interval(days => v_days)');
    expect(sql).toContain('v_previous_start := v_previous_end - make_interval(days => v_days)');
    expect(sql).toContain('cp.completed_at>=p.range_start and cp.completed_at<p.range_end');
    expect(sql).toContain("e.junta_id<>r.completed_junta_id");
    expect(sql).toContain('e.occurred_at>r.completed_at');
    expect(sql).toContain('e.occurred_at<=r.completed_at+make_interval(days => v_repeat_window_days)');
  });
});

describe('acquisition attribution', () => {
  it('normalizes campaign values without retaining unbounded URLs or payloads', () => {
    expect(normalizeCampaignValue('  launch-september  ')).toBe('launch-september');
    expect(normalizeCampaignValue('x'.repeat(200))).toHaveLength(100);
    expect(normalizeCampaignValue('   ')).toBeUndefined();
    expect(normalizeCampaignValue('https://example.com/?email=private@example.com')).toBeUndefined();
  });
});
