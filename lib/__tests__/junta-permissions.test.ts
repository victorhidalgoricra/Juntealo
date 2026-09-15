import { describe, expect, it } from 'vitest';
import { canLeaveJunta } from '@/lib/junta-permissions';

describe('canLeaveJunta', () => {
  it('allows a participant to leave before activation', () => {
    expect(canLeaveJunta({ estado: 'borrador' }, true)).toBe(true);
  });

  it('prevents a participant from leaving an active junta', () => {
    expect(canLeaveJunta({ estado: 'activa' }, true)).toBe(false);
  });

  it('prevents a participant from leaving a completed junta', () => {
    expect(canLeaveJunta({ estado: 'cerrada' }, true)).toBe(false);
  });

  it('does not allow non-members to leave', () => {
    expect(canLeaveJunta({ estado: 'borrador' }, false)).toBe(false);
  });
});
