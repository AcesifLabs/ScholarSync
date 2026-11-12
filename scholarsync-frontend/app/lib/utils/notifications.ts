import { ROUTES } from '@/app/lib/constants/routes.constants';
import { SECONDS_PER_DAY, SECONDS_PER_HOUR, SECONDS_PER_MINUTE, SECONDS_PER_WEEK } from '@/app/lib/constants/timing.constants';

export type NotificationLike = {
  type: 'GROUP_ADDED' | 'ANNOTATION_REPLY' | 'COMMENT_REPLY' | 'GROUP_PAPER_ADDED';
  actor?: { name?: string | null } | null;
  groupId?: string | null;
  groupName?: string | null;
  paperId?: string | null;
  paperTitle?: string | null;
};

/** Where clicking a notification takes the user. Falls back to /notifications when the target is unknown. */
export function notificationLink(n: NotificationLike): string {
  switch (n.type) {
    case 'ANNOTATION_REPLY':
      return n.paperId ? ROUTES.paperRead(n.paperId) : ROUTES.notifications;
    case 'COMMENT_REPLY':
      // Opens the paper's thread in the group's Discussion tab
      if (n.groupId) return ROUTES.group(n.groupId, { tab: 'discussion', paper: n.paperId ?? undefined });
      return n.paperId ? ROUTES.paper(n.paperId) : ROUTES.notifications;
    case 'GROUP_ADDED':
    case 'GROUP_PAPER_ADDED':
      return n.groupId ? ROUTES.group(n.groupId) : n.paperId ? ROUTES.paper(n.paperId) : ROUTES.notifications;
  }
}

export function notificationText(n: NotificationLike): string {
  const who = n.actor?.name?.trim() || 'Someone';
  const group = n.groupName ?? 'a group';
  const paper = n.paperTitle ? `“${n.paperTitle}”` : 'a paper';
  switch (n.type) {
    case 'GROUP_ADDED':
      return `${who} added you to ${group}`;
    case 'ANNOTATION_REPLY':
      return `${who} replied to your annotation on ${paper}`;
    case 'COMMENT_REPLY':
      return `${who} replied to your comment on ${paper}`;
    case 'GROUP_PAPER_ADDED':
      return `${who} shared ${paper} with ${group}`;
  }
}

/** "just now", "5 min ago", "3 h ago", "2 d ago", then a date. Future timestamps (clock skew) read as "just now". */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const seconds = Math.floor((now.getTime() - new Date(iso).getTime()) / 1000);
  if (Number.isNaN(seconds)) return '';
  if (seconds < SECONDS_PER_MINUTE) return 'just now';
  if (seconds < SECONDS_PER_HOUR) return `${Math.floor(seconds / SECONDS_PER_MINUTE)} min ago`;
  if (seconds < SECONDS_PER_DAY) return `${Math.floor(seconds / SECONDS_PER_HOUR)} h ago`;
  if (seconds < SECONDS_PER_WEEK) return `${Math.floor(seconds / SECONDS_PER_DAY)} d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
