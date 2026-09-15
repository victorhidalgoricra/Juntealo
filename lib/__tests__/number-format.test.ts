import { describe, expect, it } from 'vitest';
import { formatAmount, formatSoles } from '@/lib/number-format';

describe('number formatting', () => {
  it('adds thousands separators and preserves the requested decimals', () => {
    expect(formatAmount(1234567.8)).toBe('1,234,567.80');
    expect(formatAmount(1234567.8, 0)).toBe('1,234,568');
  });

  it('formats amounts in soles', () => {
    expect(formatSoles(2500)).toBe('S/ 2,500.00');
  });
});
