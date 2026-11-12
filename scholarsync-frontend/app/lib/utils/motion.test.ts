import { afterEach, describe, expect, it, vi } from 'vitest';
import { EXIT_MS, REDUCED_EXIT_MS, exitRow, exitThen, prefersReducedMotion } from './motion';

function fakeRow(connected = false) {
  const animation = { finished: Promise.resolve(), cancel: vi.fn() };
  const el = { animate: vi.fn(() => animation), offsetHeight: 40, isConnected: connected, style: { overflow: '' }, dataset: {} as { exiting?: string } };
  return { el, animation };
}

describe('exitThen', () => {
  afterEach(() => vi.useRealTimers());

  it('ignores a second exit of the same row', async () => {
    const { el } = fakeRow();
    const action = vi.fn();
    await Promise.all([exitThen(el as never, action, false), exitThen(el as never, action, false)]);
    expect(el.animate).toHaveBeenCalledOnce();
    expect(action).toHaveBeenCalledOnce();
  });

  it('still schedules the restore when the action throws', async () => {
    vi.useFakeTimers();
    const { el, animation } = fakeRow(true);
    await expect(exitThen(el as never, () => { throw new Error('boom'); }, false)).rejects.toThrow('boom');
    vi.runAllTimers();
    expect(animation.cancel).toHaveBeenCalledOnce();
    expect(el.dataset.exiting).toBeUndefined();
  });

  it('runs the action at once when there is no row', async () => {
    const action = vi.fn();
    await exitThen(null, action, false);
    expect(action).toHaveBeenCalledOnce();
  });

  it('collapses from the measured height, then runs the action', async () => {
    const { el } = fakeRow();
    const action = vi.fn();
    await exitThen(el as never, action, false);
    const [frames, options] = el.animate.mock.calls[0] as unknown as [Keyframe[], KeyframeAnimationOptions];
    expect(frames[0]).toMatchObject({ height: '40px', opacity: 1 });
    expect(frames[1]).toMatchObject({ height: '0px', opacity: 0 });
    expect(options.duration).toBe(EXIT_MS);
    expect(action).toHaveBeenCalledOnce();
  });

  it('only fades with reduced motion', async () => {
    const { el } = fakeRow();
    await exitThen(el as never, () => {}, true);
    const [frames, options] = el.animate.mock.calls[0] as unknown as [Keyframe[], KeyframeAnimationOptions];
    expect(frames).toEqual([{ opacity: 1 }, { opacity: 0 }]);
    expect(options.duration).toBe(REDUCED_EXIT_MS);
  });

  it('shows the row again when the action left it on the page', async () => {
    vi.useFakeTimers();
    const { el, animation } = fakeRow(true);
    await exitThen(el as never, () => {}, false);
    vi.runAllTimers();
    expect(animation.cancel).toHaveBeenCalledOnce();
    expect(el.style.overflow).toBe('');
  });

  it('leaves a removed row alone', async () => {
    vi.useFakeTimers();
    const { el, animation } = fakeRow(false);
    await exitThen(el as never, () => {}, false);
    vi.runAllTimers();
    expect(animation.cancel).not.toHaveBeenCalled();
  });
});

describe('exitRow', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('finds the row by its data-exit key', async () => {
    const { el } = fakeRow();
    const querySelector = vi.fn(() => el);
    vi.stubGlobal('document', { querySelector });
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    const action = vi.fn();
    exitRow('library:p1', action);
    await vi.waitFor(() => expect(action).toHaveBeenCalledOnce());
    expect(querySelector).toHaveBeenCalledWith('[data-exit="library:p1"]');
  });

  it('still removes when no row matches', () => {
    vi.stubGlobal('document', { querySelector: () => null });
    const action = vi.fn();
    exitRow('missing', action);
    expect(action).toHaveBeenCalledOnce();
  });

  it('still removes without a document', () => {
    const action = vi.fn();
    exitRow('ssr', action);
    expect(action).toHaveBeenCalledOnce();
  });
});

describe('prefersReducedMotion', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is false without a window', () => {
    expect(prefersReducedMotion()).toBe(false);
  });

  it('is false when matchMedia is missing', () => {
    vi.stubGlobal('window', {});
    expect(prefersReducedMotion()).toBe(false);
  });

  it('follows the media query', () => {
    vi.stubGlobal('window', { matchMedia: (q: string) => ({ matches: q === '(prefers-reduced-motion: reduce)' }) });
    expect(prefersReducedMotion()).toBe(true);
  });
});
