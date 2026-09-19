import { describe, expect, it } from 'vitest';
import { sanitizeProductEventMetadata } from '@/services/product-analytics.service';
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

describe('acquisition attribution', () => {
  it('normalizes campaign values without retaining unbounded URLs or payloads', () => {
    expect(normalizeCampaignValue('  launch-september  ')).toBe('launch-september');
    expect(normalizeCampaignValue('x'.repeat(200))).toHaveLength(100);
    expect(normalizeCampaignValue('   ')).toBeUndefined();
    expect(normalizeCampaignValue('https://example.com/?email=private@example.com')).toBeUndefined();
  });
});
