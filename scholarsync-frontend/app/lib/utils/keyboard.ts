/** Whether a key press belongs to a text field rather than the page (inputs, textareas, selects, contenteditable). */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== 'function') return false;
  const el = target as HTMLElement;
  if (el.isContentEditable) return true;
  return !!el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="combobox"], [role="listbox"], [role="menu"], [role="dialog"] [role="textbox"]');
}

type KeyEventLike = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'target' | 'defaultPrevented' | 'repeat'>;

/** A single-key shortcut fires only with no Ctrl/Cmd/Alt, outside text fields, and not already handled. */
export function isSingleKeyShortcut(event: KeyEventLike, key: string): boolean {
  return event.key === key && !event.ctrlKey && !event.metaKey && !event.altKey
    && !event.defaultPrevented && !isTypingTarget(event.target);
}
