import { describe, expect, it } from 'vitest';
import { getJuntaDisplayCode, getJuntaDisplayTitle } from '@/lib/junta-display';

describe('junta display helpers', () => {
  it('prioritizes and normalizes the access code', () => {
    expect(getJuntaDisplayCode({ id: '12345678', access_code: ' ab12cd ' })).toBe('AB12CD');
  });

  it('builds a stable short code from the id when there is no access code', () => {
    expect(getJuntaDisplayCode({ id: '33333333-aaaa-bbbb-cccc-123456789012' })).toBe('JNT-333333');
  });

  it('includes the name and code in the display title', () => {
    expect(getJuntaDisplayTitle({ id: '12345678', nombre: 'Ahorro familiar', access_code: 'fam123' }))
      .toBe('Ahorro familiar · FAM123');
  });
});
