// Mirror --default-transition-duration and --ease-quiet in app/globals.css
export const EXIT_MS = 180;
export const REDUCED_EXIT_MS = 120;
const EASE = 'cubic-bezier(0.2, 0, 0, 1)';
/** If the action leaves the row on the page (it failed before removing it), the row is shown again after this. */
const RESTORE_AFTER_MS = 1000;

type Exiting = Pick<HTMLElement, 'animate' | 'offsetHeight' | 'isConnected'> & { style: { overflow: string }; dataset: { exiting?: string } };

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * shortcut: animates height and padding, which costs layout work each frame; fine for one row, keep it off bulk actions.
 * Plays a row's exit (fade and collapse; fade only with reduced motion), then runs {@code action}, which removes the
 * row. The row stays hidden until React unmounts it, so nothing flashes back in between.
 */
export async function exitThen(el: Exiting | null | undefined, action: () => void, reduced = prefersReducedMotion()): Promise<void> {
  if (!el?.animate) {
    action();
    return;
  }
  // A second click during the exit would run the removal twice (two toasts, the first Undo dead)
  if (el.dataset.exiting) return;
  el.dataset.exiting = 'true';
  el.style.overflow = 'hidden';
  const collapsed = { opacity: 0, height: '0px', paddingTop: '0px', paddingBottom: '0px', marginTop: '0px', marginBottom: '0px', borderWidth: '0px' };
  const frames = reduced ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 1, height: `${el.offsetHeight}px` }, collapsed];
  const animation = el.animate(frames, { duration: reduced ? REDUCED_EXIT_MS : EXIT_MS, easing: EASE, fill: 'forwards' });
  await animation.finished.catch(() => undefined);
  try {
    action();
  } finally {
    setTimeout(() => {
      if (!el.isConnected) return;
      animation.cancel();
      el.style.overflow = '';
      delete el.dataset.exiting;
    }, RESTORE_AFTER_MS);
  }
}

/** Exits the row tagged {@code data-exit={key}}, wherever the click came from (row menus render in a portal). */
export function exitRow(key: string, action: () => void): void {
  const el = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>(`[data-exit="${key}"]`);
  void exitThen(el, action);
}
