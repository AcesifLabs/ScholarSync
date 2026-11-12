import { describe, expect, it } from 'vitest';
import { settleLimited } from './batch';

describe('settleLimited', () => {
  it('never runs more than the limit at once and counts failures', async () => {
    let inFlight = 0;
    let peak = 0;
    const result = await settleLimited([1, 2, 3, 4, 5, 6, 7], 3, async n => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise(r => setTimeout(r, 5));
      inFlight--;
      if (n % 3 === 0) throw new Error('nope');
    });
    expect(peak).toBe(3);
    expect(result).toEqual({ ok: 5, failed: 2 });
  });

  it('handles an empty list', async () => {
    expect(await settleLimited([], 5, async () => {})).toEqual({ ok: 0, failed: 0 });
  });
});
