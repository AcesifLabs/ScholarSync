import { describe, expect, it } from 'vitest';
import { atLeast } from './groups';

describe('atLeast', () => {
  it.each([
    ['OWNER', 'ADMIN', true],
    ['ADMIN', 'ADMIN', true],
    ['MEMBER', 'ADMIN', false],
    ['VIEWER', 'MEMBER', false],
    ['MEMBER', 'VIEWER', true],
    ['OWNER', 'OWNER', true],
    ['ADMIN', 'OWNER', false],
    [undefined, 'VIEWER', false],
  ] as const)('%s at least %s → %s', (role, required, expected) => {
    expect(atLeast(role, required)).toBe(expected);
  });
});
