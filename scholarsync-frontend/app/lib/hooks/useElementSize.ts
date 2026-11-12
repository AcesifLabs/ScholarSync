import { useEffect, useState } from 'react';

type CallbackRef<T> = ((node: T | null) => void) & { current: T | null };
type Size = { width: number; height: number };

/**
 * Tracks an element's content size in whole pixels. Returns a callback ref (with `.current` like a ref object) so the
 * observer attaches whenever the element mounts, including after the component first rendered a loading state without it.
 * With `debounceMs`, later changes apply only once resizing pauses (the first measurement is immediate).
 */
export function useElementSize<T extends HTMLElement>(debounceMs = 0) {
  const [element, setElement] = useState<T | null>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [ref] = useState<CallbackRef<T>>(() => {
    const callback = ((node: T | null) => {
      callback.current = node;
      setElement(node);
    }) as CallbackRef<T>;
    callback.current = null;
    return callback;
  });

  useEffect(() => {
    if (!element) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let measured = false;
    // Same-size updates keep the previous object, so sub-pixel jitter doesn't re-render
    const apply = (next: Size) => setSize(prev => (prev.width === next.width && prev.height === next.height ? prev : next));
    const observer = new ResizeObserver(([entry]) => {
      const next = { width: Math.floor(entry.contentRect.width), height: Math.floor(entry.contentRect.height) };
      clearTimeout(timer);
      if (!measured || debounceMs <= 0) {
        measured = true;
        apply(next);
      } else {
        timer = setTimeout(() => apply(next), debounceMs);
      }
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [element, debounceMs]);

  return [ref, size, element] as const;
}
