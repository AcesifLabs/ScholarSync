import type { Schemas } from '@/app/api/client';

export type GroupRole = Schemas['GroupSummary']['myRole'];
export type AssignableRole = Exclude<GroupRole, 'OWNER'>;

/** Lower rank = more rights. */
export const ROLE_RANK: Record<GroupRole, number> = { OWNER: 0, ADMIN: 1, MEMBER: 2, VIEWER: 3 };

export const ROLE_OPTIONS: { value: AssignableRole; label: string }[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MEMBER', label: 'Member' },
  { value: 'VIEWER', label: 'Viewer' },
];

export const GROUP_TABS = ['library', 'discussion', 'annotations', 'members', 'activity'] as const;

/** What each role can do, highest first; shown wherever roles are assigned. */
export const ROLE_DESCRIPTIONS: { role: GroupRole; label: string; can: string }[] = [
  { role: 'OWNER', label: 'Owner', can: 'Everything an admin can, plus deleting the group. There is one owner.' },
  { role: 'ADMIN', label: 'Admin', can: 'Add and remove members and papers, change roles below admin, create invite links, edit the group.' },
  { role: 'MEMBER', label: 'Member', can: 'Share papers, post in discussions, add group annotations and reply to them.' },
  { role: 'VIEWER', label: 'Viewer', can: 'Read the shared papers, discussions and annotations, without posting.' },
];
export type GroupTab = (typeof GROUP_TABS)[number];

export const INVITE_EXPIRY_OPTIONS = [
  { value: '24', label: 'Expires in 1 day' },
  { value: '168', label: 'Expires in 7 days' },
  { value: '720', label: 'Expires in 30 days' },
] as const;

export type InviteExpiry = (typeof INVITE_EXPIRY_OPTIONS)[number]['value'];
export const DEFAULT_INVITE_EXPIRY: InviteExpiry = '168';
