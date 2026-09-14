import { describe, expect, it } from 'vitest';
import { getMemberAvatarStyle } from '@/lib/profile-display';

describe('getMemberAvatarStyle', () => {
  it('assigns a different color to every possible member in a junta', () => {
    const backgrounds = Array.from(
      { length: 40 },
      (_, index) => getMemberAvatarStyle(index).backgroundColor
    );

    expect(new Set(backgrounds).size).toBe(backgrounds.length);
  });

  it('keeps the color stable for the same position', () => {
    expect(getMemberAvatarStyle(4)).toEqual(getMemberAvatarStyle(4));
  });
});
