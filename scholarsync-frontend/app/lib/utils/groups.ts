import { GroupRole, ROLE_RANK } from '@/app/lib/constants/group.constants';

/** Whether `role` has at least the rights of `required` (OWNER > ADMIN > MEMBER > VIEWER). */
export const atLeast = (role: GroupRole | undefined, required: GroupRole) => !!role && ROLE_RANK[role] <= ROLE_RANK[required];
