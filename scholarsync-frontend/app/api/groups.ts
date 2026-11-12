import { QueryKey, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, Schemas, unwrap } from '@/app/api/client';
import { useAuth } from '@/app/lib/providers/AuthProvider';
import type { GroupRole } from '@/app/lib/constants/group.constants';
import { GROUP_ACTIVITY_PAGE_SIZE, GROUP_ANNOTATIONS_PAGE_SIZE, MY_ACTIVITY_LIMIT } from '@/app/lib/constants/pagination.constants';
import { QUERY_KEYS } from '@/app/lib/constants/query-keys.constants';

const KEYS = QUERY_KEYS.groups;
const path = (groupId: string) => ({ params: { path: { groupId } } });

/** Optionally narrowed with `select`, so a component re-renders only when its slice of the list changes. */
export function useMyGroups<T = Schemas['GroupSummary'][]>(select?: (groups: Schemas['GroupSummary'][]) => T) {
  const { user } = useAuth();
  return useQuery({ queryKey: KEYS.mine, queryFn: () => unwrap(api.GET('/api/v1/groups')), enabled: !!user, select });
}

export function useGroup(groupId: string) {
  return useQuery({ queryKey: KEYS.detail(groupId), queryFn: () => unwrap(api.GET('/api/v1/groups/{groupId}', path(groupId))), retry: false });
}

export function useMembers(groupId: string) {
  return useQuery({ queryKey: KEYS.members(groupId), queryFn: () => unwrap(api.GET('/api/v1/groups/{groupId}/members', path(groupId))) });
}

export function useInvites(groupId: string, enabled: boolean) {
  return useQuery({
    queryKey: KEYS.invites(groupId),
    queryFn: () => unwrap(api.GET('/api/v1/groups/{groupId}/invites', path(groupId))),
    enabled,
  });
}

export function useGroupPapers(groupId: string) {
  return useQuery({ queryKey: KEYS.papers(groupId), queryFn: () => unwrap(api.GET('/api/v1/groups/{groupId}/papers', path(groupId))) });
}

/** Every annotation shared with the group, newest first, paged. */
export function useGroupAnnotations(groupId: string, page: number) {
  return useQuery({
    queryKey: KEYS.annotations(groupId, page),
    queryFn: () => unwrap(api.GET('/api/v1/groups/{groupId}/annotations', { params: { path: { groupId }, query: { page, size: GROUP_ANNOTATIONS_PAGE_SIZE } } })),
    staleTime: 0,
    placeholderData: previous => previous,
  });
}

export function useComments(groupId: string, paperId: string | null) {
  return useQuery({
    queryKey: KEYS.comments(groupId, paperId),
    queryFn: () => unwrap(api.GET('/api/v1/groups/{groupId}/papers/{paperId}/comments', { params: { path: { groupId, paperId: paperId! } } })),
    enabled: !!paperId,
  });
}

export function useGroupActivity(groupId: string, filters: { actorId?: string; paperId?: string }) {
  return useInfiniteQuery({
    queryKey: KEYS.activity(groupId, filters),
    queryFn: ({ pageParam }) => unwrap(api.GET('/api/v1/groups/{groupId}/activity', {
      params: { path: { groupId }, query: { ...filters, before: pageParam, limit: GROUP_ACTIVITY_PAGE_SIZE } },
    })),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: last => (last.length === GROUP_ACTIVITY_PAGE_SIZE ? last[last.length - 1].id : undefined),
  });
}

export function useMyActivity(limit = MY_ACTIVITY_LIMIT) {
  const { user } = useAuth();
  return useQuery({
    queryKey: KEYS.myActivity(limit),
    queryFn: () => unwrap(api.GET('/api/v1/groups/activity/mine', { params: { query: { limit } } })),
    enabled: !!user,
  });
}

/**
 * Refreshes only the queries a mutation touched. Invalidation is not awaited so delete/leave can navigate away, and a
 * deleted or left group's own queries are never refetched (that would flash "Not found" before the redirect).
 */
function useGroupMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>, affected: (args: TArgs, data?: TResult) => QueryKey[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: (data, _error, args) => {
      affected(args, data).forEach(queryKey => void queryClient.invalidateQueries({ queryKey }));
    },
  });
}

type GroupArgs = { groupId: string };
/** Membership changes show up in the group header, the members list, everyone's group cards and the feed. */
const membership = ({ groupId }: GroupArgs) => [KEYS.detail(groupId), KEYS.members(groupId), KEYS.mine, KEYS.activity(groupId)];

export const useCreateGroup = () => useGroupMutation((body: Schemas['GroupCreateRequest']) => unwrap(api.POST('/api/v1/groups', { body })),
  () => [KEYS.mine]);

export const useUpdateGroup = () => useGroupMutation(({ groupId, ...body }: GroupArgs & Schemas['GroupUpdateRequest']) =>
  unwrap(api.PATCH('/api/v1/groups/{groupId}', { ...path(groupId), body })), ({ groupId }) => [KEYS.detail(groupId), KEYS.mine]);

export const useDeleteGroup = () => useGroupMutation((groupId: string) => unwrap(api.DELETE('/api/v1/groups/{groupId}', path(groupId))),
  () => [KEYS.mine, KEYS.myActivityAll]);

export const useLeaveGroup = () => useGroupMutation((groupId: string) => unwrap(api.POST('/api/v1/groups/{groupId}/leave', path(groupId))),
  () => [KEYS.mine, KEYS.myActivityAll]);

export const useAddMember = () => useGroupMutation(({ groupId, ...body }: GroupArgs & Schemas['MemberAddRequest']) =>
  unwrap(api.POST('/api/v1/groups/{groupId}/members', { ...path(groupId), body })), membership);

export const useChangeRole = () => useGroupMutation(({ groupId, userId, role }: GroupArgs & { userId: string; role: GroupRole }) =>
  unwrap(api.PATCH('/api/v1/groups/{groupId}/members/{userId}', { params: { path: { groupId, userId } }, body: { role } })),
({ groupId }) => [KEYS.members(groupId)]);

export const useRemoveMember = () => useGroupMutation(({ groupId, userId }: GroupArgs & { userId: string }) =>
  unwrap(api.DELETE('/api/v1/groups/{groupId}/members/{userId}', { params: { path: { groupId, userId } } })), membership);

export const useCreateInvite = () => useGroupMutation(({ groupId, ...body }: GroupArgs & Schemas['InviteCreateRequest']) =>
  unwrap(api.POST('/api/v1/groups/{groupId}/invites', { ...path(groupId), body })), ({ groupId }) => [KEYS.invites(groupId)]);

export const useRevokeInvite = () => useGroupMutation(({ groupId, inviteId }: GroupArgs & { inviteId: string }) =>
  unwrap(api.DELETE('/api/v1/groups/{groupId}/invites/{inviteId}', { params: { path: { groupId, inviteId } } })),
({ groupId }) => [KEYS.invites(groupId)]);

export const useJoinGroup = () => useGroupMutation((token: string) =>
  unwrap(api.POST('/api/v1/groups/join/{token}', { params: { path: { token } } })),
(_token, group) => [KEYS.mine, KEYS.myActivityAll, ...(group ? membership({ groupId: group.id }) : [])]);

export const useAddGroupPaper = () => useGroupMutation(({ groupId, paperId }: GroupArgs & { paperId: string }) =>
  unwrap(api.POST('/api/v1/groups/{groupId}/papers', { ...path(groupId), body: { paperId } })),
({ groupId }) => [KEYS.papers(groupId), KEYS.activity(groupId), KEYS.myActivityAll]);

export const useRemoveGroupPaper = () => useGroupMutation(({ groupId, paperId }: GroupArgs & { paperId: string }) =>
  unwrap(api.DELETE('/api/v1/groups/{groupId}/papers/{paperId}', { params: { path: { groupId, paperId } } })),
({ groupId }) => [KEYS.papers(groupId)]);

export const usePostComment = () => useGroupMutation(
  ({ groupId, paperId, ...body }: GroupArgs & { paperId: string } & Schemas['CommentCreateRequest']) =>
    unwrap(api.POST('/api/v1/groups/{groupId}/papers/{paperId}/comments', { params: { path: { groupId, paperId } }, body })),
  ({ groupId, paperId }) => [KEYS.comments(groupId, paperId), KEYS.activity(groupId), KEYS.myActivityAll]);

export const useEditComment = () => useGroupMutation(({ groupId, commentId, bodyMd }: GroupArgs & { commentId: string; bodyMd: string }) =>
  unwrap(api.PATCH('/api/v1/groups/{groupId}/comments/{commentId}', { params: { path: { groupId, commentId } }, body: { bodyMd } })),
({ groupId }) => [KEYS.comments(groupId)]);

export const useDeleteComment = () => useGroupMutation(({ groupId, commentId }: GroupArgs & { commentId: string }) =>
  unwrap(api.DELETE('/api/v1/groups/{groupId}/comments/{commentId}', { params: { path: { groupId, commentId } } })),
({ groupId }) => [KEYS.comments(groupId)]);
