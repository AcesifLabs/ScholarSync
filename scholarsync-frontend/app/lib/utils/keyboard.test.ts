import { describe, expect, it } from 'vitest';
import { isSingleKeyShortcut, isTypingTarget } from './keyboard';

// No DOM in these tests: fake elements answer closest() by tag name
const el = (tag: string, editable = false) => ({
  isContentEditable: editable,
  closest: (selector: string) => (selector.split(',').some(s => s.trim() === tag) ? {} : null),
}) as unknown as HTMLElement;

const event = (key: string, target: EventTarget | null, mods: Partial<Record<'ctrlKey' | 'metaKey' | 'altKey', boolean>> = {}) =>
  ({ key, target, ctrlKey: false, metaKey: false, altKey: false, defaultPrevented: false, repeat: false, ...mods });

describe('keyboard shortcuts', () => {
  it('treat text fields and editable content as typing targets', () => {
    expect(isTypingTarget(el('input'))).toBe(true);
    expect(isTypingTarget(el('textarea'))).toBe(true);
    expect(isTypingTarget(el('div', true))).toBe(true);
    expect(isTypingTarget(el('button'))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });

  it('fire only without modifiers and outside text fields', () => {
    const body = el('body');
    expect(isSingleKeyShortcut(event('j', body), 'j')).toBe(true);
    expect(isSingleKeyShortcut(event('j', body, { ctrlKey: true }), 'j')).toBe(false);
    expect(isSingleKeyShortcut(event('j', body, { metaKey: true }), 'j')).toBe(false);
    expect(isSingleKeyShortcut(event('j', body, { altKey: true }), 'j')).toBe(false);
    expect(isSingleKeyShortcut(event('j', el('textarea')), 'j')).toBe(false);
    expect(isSingleKeyShortcut(event('k', body), 'j')).toBe(false);
  });
});
