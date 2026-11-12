'use client';

import React, { useState } from "react";
import { toast } from "sonner";
import { Copy, Link2, UserMinus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    useAddMember, useChangeRole, useCreateInvite, useInvites, useMembers, useRemoveMember, useRevokeInvite,
} from "@/app/api/groups";
import { atLeast } from "@/app/lib/utils/groups";
import { Avatar } from "@/app/ui/components/Avatar";
import { useUndoable } from "@/app/lib/hooks/useUndoable";
import { RoleHelp } from "./RoleHelp";
import { ErrorState } from "@/app/ui/components/ErrorState";
import { ListSkeleton } from "@/app/ui/components/Skeletons";
import { SimpleSelect } from "@/app/ui/components/SimpleSelect";
import { ConfirmDialog } from "@/app/ui/components/ConfirmDialog";
import { toastError } from "@/app/lib/utils/toast";
import { friendlyError } from "@/app/lib/utils/errors";
import {
    AssignableRole, DEFAULT_INVITE_EXPIRY, GroupRole, INVITE_EXPIRY_OPTIONS, InviteExpiry, ROLE_OPTIONS,
} from "@/app/lib/constants/group.constants";
import { ROUTES } from "@/app/lib/constants/routes.constants";

export function MembersTab({ groupId, role }: { groupId: string; role: GroupRole }) {
    const isAdmin = atLeast(role, "ADMIN");
    const members = useMembers(groupId);
    const invites = useInvites(groupId, isAdmin);
    const add = useAddMember();
    const changeRole = useChangeRole();
    const remove = useRemoveMember();
    const createInvite = useCreateInvite();
    const revoke = useRevokeInvite();
    const [email, setEmail] = useState("");
    const [newRole, setNewRole] = useState<AssignableRole>("MEMBER");
    const [inviteRole, setInviteRole] = useState<AssignableRole>("MEMBER");
    const [hours, setHours] = useState<InviteExpiry>(DEFAULT_INVITE_EXPIRY);
    const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null);
    const [revoking, setRevoking] = useState<string | null>(null);
    const undoable = useUndoable();
    const roleKey = (userId: string) => `role:${groupId}:${userId}`;

    const inviteUrl = (token: string) => `${window.location.origin}${ROUTES.joinGroup(token)}`;
    const addMember = (event: React.FormEvent) => {
        event.preventDefault();
        add.mutate({ groupId, email: email.trim(), role: newRole }, {
            // the API answers the same whether or not the address has an account, so the message cannot say who was added
            onSuccess: () => { setEmail(""); toast.success("If that address has a ScholarSync account, they were added"); },
        });
    };

    return (
        <section className="flex flex-col gap-6">
            {members.isPending && <ListSkeleton rows={3} />}
            {members.error && <ErrorState error={members.error} onRetry={() => members.refetch()} />}
            {members.data && (
                <section className="flex flex-col gap-2" aria-labelledby="members-heading">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 id="members-heading" className="font-semibold">Members</h3>
                    <RoleHelp />
                </div>
                <ul className="flex flex-col divide-y *:enter border-y">
                    {members.data.map(m => (
                        <li key={m.user.id} className="flex flex-wrap items-center gap-3 py-2.5">
                            <Avatar name={m.user.name} />
                            <span className="min-w-0 flex-1 truncate font-medium">{m.user.name}</span>
                            {isAdmin && m.role !== "OWNER" ? (
                                <>
                                    <SimpleSelect
                                        size="sm"
                                        aria-label={`Role for ${m.user.name}`}
                                        value={undoable.pendingValue<AssignableRole>(roleKey(m.user.id)) ?? (m.role as AssignableRole)}
                                        options={ROLE_OPTIONS}
                                        // Picking the current role again cancels a pending change instead of doing nothing
                                        onValueChange={next => next === m.role ? undoable.cancel(roleKey(m.user.id)) : undoable.run({
                                            key: roleKey(m.user.id),
                                            value: next,
                                            message: `${m.user.name} will be ${next === "ADMIN" ? "an" : "a"} ${next.toLowerCase()}`,
                                            commit: () => changeRole.mutate({ groupId, userId: m.user.id, role: next }, { onError: toastError }),
                                        })}
                                    />
                                    <Button variant="ghost" size="icon-sm" aria-label={`Remove ${m.user.name}`} onClick={() => setRemoving({ id: m.user.id, name: m.user.name })}>
                                        <UserMinus />
                                    </Button>
                                </>
                            ) : <Badge variant="secondary" className="capitalize">{m.role.toLowerCase()}</Badge>}
                        </li>
                    ))}
                </ul>
                </section>
            )}

            {isAdmin && (
                <section className="flex flex-col gap-3" aria-labelledby="invite-heading">
                    <h3 id="invite-heading" className="font-semibold">Invite people</h3>
                    <Tabs defaultValue="email" className="gap-4">
                        <TabsList>
                            <TabsTrigger value="email"><UserPlus /> By email</TabsTrigger>
                            <TabsTrigger value="link"><Link2 /> By link</TabsTrigger>
                        </TabsList>
                        <TabsContent value="email" className="flex flex-col gap-2">
                            <p className="text-sm text-muted-foreground">They need to have signed in to ScholarSync once.</p>
                            <form onSubmit={addMember} className="flex max-w-2xl flex-wrap gap-2" aria-label="Add member by email">
                                <Input type="email" required value={email} onChange={e => { setEmail(e.target.value); add.reset(); }} placeholder="colleague@university.edu" aria-label="Email" className="min-w-48 flex-1"
                                    aria-invalid={!!add.error || undefined} aria-describedby={add.error ? "add-member-error" : undefined} />
                                <SimpleSelect aria-label="Role" value={newRole} options={ROLE_OPTIONS} onValueChange={setNewRole} />
                                <Button type="submit" disabled={!email.trim() || add.isPending}>Add</Button>
                            </form>
                            {add.error && <p id="add-member-error" role="alert" className="text-sm text-destructive">{friendlyError(add.error).title}. {friendlyError(add.error).message}</p>}
                        </TabsContent>
                        <TabsContent value="link" className="flex flex-col gap-3">
                            <p className="text-sm text-muted-foreground">Anyone with a link can join with the role you choose, until it expires or you revoke it.</p>
                            <div className="flex flex-wrap gap-2">
                                <SimpleSelect aria-label="Invite role" value={inviteRole} options={ROLE_OPTIONS} onValueChange={setInviteRole} />
                                <SimpleSelect aria-label="Expires after" value={hours} options={INVITE_EXPIRY_OPTIONS} onValueChange={setHours} />
                                <Button variant="outline" disabled={createInvite.isPending} onClick={() => createInvite.mutate({ groupId, role: inviteRole, expiresInHours: Number(hours) }, {
                                    onSuccess: () => toast.success("Invite link created"), onError: toastError,
                                })}>
                                    Create link
                                </Button>
                            </div>
                            {invites.data?.length === 0 && <p className="text-sm text-muted-foreground">No active links.</p>}
                            {!!invites.data?.length && (
                                <ul className="flex flex-col divide-y *:enter border-y">
                                    {invites.data.map(i => (
                                        <li key={i.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                                            <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1 text-xs">{inviteUrl(i.token)}</code>
                                            <span className="text-xs capitalize text-muted-foreground">{i.role.toLowerCase()} · until {new Date(i.expiresAt).toLocaleDateString()}</span>
                                            <Button variant="ghost" size="icon-sm" aria-label="Copy invite link" onClick={() => navigator.clipboard.writeText(inviteUrl(i.token)).then(() => toast.success("Link copied"))}>
                                                <Copy />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => setRevoking(i.id)}>Revoke</Button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </TabsContent>
                    </Tabs>
                </section>
            )}

            <ConfirmDialog
                open={revoking !== null}
                onOpenChange={open => !open && setRevoking(null)}
                title="Revoke this invite link?"
                description="The link stops working at once. People who already joined through it stay in the group."
                confirmLabel="Revoke link"
                destructive
                pending={revoke.isPending}
                onConfirm={() => revoking && revoke.mutate({ groupId, inviteId: revoking }, {
                    onSuccess: () => { toast("Link revoked"); setRevoking(null); }, onError: toastError,
                })}
            />
            <ConfirmDialog
                open={removing !== null}
                onOpenChange={open => !open && setRemoving(null)}
                title={`Remove ${removing?.name}?`}
                description="They lose access to the group's papers, discussions and annotations."
                confirmLabel="Remove member"
                destructive
                pending={remove.isPending}
                onConfirm={() => removing && remove.mutate({ groupId, userId: removing.id }, {
                    onSuccess: () => { toast(`${removing.name} removed`); setRemoving(null); }, onError: toastError,
                })}
            />
        </section>
    );
}
