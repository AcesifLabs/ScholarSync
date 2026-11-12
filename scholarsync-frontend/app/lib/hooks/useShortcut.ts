'use client';

import { useEffect, useRef } from 'react';
import { isSingleKeyShortcut } from '@/app/lib/utils/keyboard';
import { useLocalSetting } from '@/app/lib/hooks/useLocalSetting';
import { SETTING_KEYS } from '@/app/lib/constants/ui.constants';

/** Whether single-key shortcuts are on (people using speech input or switch access can turn them off). */
export const useShortcutsEnabled = () => useLocalSetting<boolean>(SETTING_KEYS.shortcutsEnabled, true);

/** Calls {@code handler} on a single-key shortcut ({@link isSingleKeyShortcut}), unless shortcuts are turned off. */
export function useShortcut(key: string, handler: (event: KeyboardEvent) => void, enabled = true) {
  const [on] = useShortcutsEnabled();
  const latest = useRef(handler);
  useEffect(() => { latest.current = handler; });
  useEffect(() => {
    if (!on || !enabled) return;
    const listener = (event: KeyboardEvent) => {
      if (!isSingleKeyShortcut(event, key)) return;
      event.preventDefault();
      latest.current(event);
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [key, on, enabled]);
}
