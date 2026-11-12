import { describe, expect, it } from 'vitest';
import { NotificationLike, notificationLink, notificationText, timeAgo } from './notifications';

const base: NotificationLike = { type: 'GROUP_ADDED', actor: { name: 'Ada' }, groupId: 'g1', groupName: 'Club', paperId: 'p/1', paperTitle: 'Graphs' };

describe('notificationLink', () => {
  it.each([
    [{ ...base, type: 'GROUP_ADDED' }, '/groups/g1'],
    [{ ...base, type: 'GROUP_PAPER_ADDED' }, '/groups/g1'],
    [{ ...base, type: 'COMMENT_REPLY' }, '/groups/g1?tab=discussion&paper=p%2F1'],
    [{ ...base, type: 'COMMENT_REPLY', paperId: null }, '/groups/g1?tab=discussion'],
    [{ ...base, type: 'ANNOTATION_REPLY' }, '/paper/p%2F1/read'],
    [{ ...base, type: 'ANNOTATION_REPLY', paperId: null }, '/notifications'],
    [{ ...base, type: 'COMMENT_REPLY', groupId: null }, '/paper/p%2F1'],
    [{ type: 'GROUP_ADDED' }, '/notifications'],
  ] as [NotificationLike, string][])('%j → %s', (n, expected) => {
    expect(notificationLink(n)).toBe(expected);
  });
});

describe('notificationText', () => {
  it.each([
    [{ ...base, type: 'GROUP_ADDED' }, 'Ada added you to Club'],
    [{ ...base, type: 'ANNOTATION_REPLY' }, 'Ada replied to your annotation on “Graphs”'],
    [{ ...base, type: 'COMMENT_REPLY' }, 'Ada replied to your comment on “Graphs”'],
    [{ ...base, type: 'GROUP_PAPER_ADDED' }, 'Ada shared “Graphs” with Club'],
    [{ type: 'GROUP_PAPER_ADDED', actor: { name: ' ' } }, 'Someone shared a paper with a group'],
    [{ type: 'GROUP_ADDED', actor: null }, 'Someone added you to a group'],
  ] as [NotificationLike, string][])('%j → %s', (n, expected) => {
    expect(notificationText(n)).toBe(expected);
  });
});

describe('timeAgo', () => {
  const now = new Date('2026-11-11T12:00:00Z');
  it.each([
    ['2026-11-11T11:59:30Z', 'just now'],
    ['2026-11-11T12:05:00Z', 'just now'],
    ['2026-11-11T11:55:00Z', '5 min ago'],
    ['2026-11-11T09:00:00Z', '3 h ago'],
    ['2026-11-09T12:00:00Z', '2 d ago'],
    ['2026-10-01T12:00:00Z', '1 Oct 2026'],
    ['not a date', ''],
  ])('%s → %s', (iso, expected) => {
    expect(timeAgo(iso, now)).toBe(expected);
  });
});
