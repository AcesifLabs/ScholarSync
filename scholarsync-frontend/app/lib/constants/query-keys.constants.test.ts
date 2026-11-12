import { describe, expect, it } from 'vitest';
import { QUERY_KEYS } from './query-keys.constants';

const startsWith = (key: readonly unknown[], prefix: readonly unknown[]) => prefix.every((part, i) => key[i] === part);

describe('QUERY_KEYS', () => {
  it('nests every collection query, including shared links, under the collections root', () => {
    for (const key of [QUERY_KEYS.collections.list(true), QUERY_KEYS.collections.detail('c'), QUERY_KEYS.collections.shared('t')]) {
      expect(startsWith(key, QUERY_KEYS.collections.all)).toBe(true);
    }
    expect(startsWith(QUERY_KEYS.collections.list(false), QUERY_KEYS.collections.lists)).toBe(true);
    expect(startsWith(QUERY_KEYS.collections.detail('c'), QUERY_KEYS.collections.lists)).toBe(false);
  });

  it('keeps one group\'s queries under its prefix and apart from other groups', () => {
    const group = QUERY_KEYS.groups.group('g1');
    for (const key of [
      QUERY_KEYS.groups.detail('g1'), QUERY_KEYS.groups.members('g1'), QUERY_KEYS.groups.invites('g1'), QUERY_KEYS.groups.papers('g1'),
      QUERY_KEYS.groups.comments('g1', 'p'), QUERY_KEYS.groups.activity('g1', {}),
    ]) {
      expect(startsWith(key, group)).toBe(true);
    }
    expect(startsWith(QUERY_KEYS.groups.detail('g2'), group)).toBe(false);
    expect(startsWith(QUERY_KEYS.groups.comments('g1', 'p'), QUERY_KEYS.groups.comments('g1'))).toBe(true);
    expect(startsWith(QUERY_KEYS.groups.activity('g1', { actorId: 'a' }), QUERY_KEYS.groups.activity('g1'))).toBe(true);
    // A group detail invalidation must not refetch its members or activity
    expect(startsWith(QUERY_KEYS.groups.members('g1'), QUERY_KEYS.groups.detail('g1'))).toBe(false);
  });

  it('separates library lists from the states map', () => {
    expect(startsWith(QUERY_KEYS.library.list({ page: 0 }), QUERY_KEYS.library.lists)).toBe(true);
    expect(startsWith(QUERY_KEYS.library.states, QUERY_KEYS.library.lists)).toBe(false);
    expect(startsWith(QUERY_KEYS.library.states, QUERY_KEYS.library.all)).toBe(true);
  });

  it('nests notification pages under their prefix', () => {
    expect(startsWith(QUERY_KEYS.notifications.pages(true), QUERY_KEYS.notifications.pagesAll)).toBe(true);
    expect(startsWith(QUERY_KEYS.notifications.unread, QUERY_KEYS.notifications.pagesAll)).toBe(false);
  });
});
