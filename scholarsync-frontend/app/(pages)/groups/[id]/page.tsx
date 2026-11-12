'use client';

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, LogOut, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useDeleteGroup, useGroup, useLeaveGroup, useUpdateGroup } from "@/app/api/groups";
import { atLeast } from "@/app/lib/utils/groups";
import { GROUP_TABS, GroupTab } from "@/app/lib/constants/group.constants";
import { parseTags } from "@/app/lib/utils/array";
import { DetailsDialog } from "@/app/ui/components/DetailsDialog";
import { PageContainer } from "@/app/ui/components/PageContainer";
import { PageHeader } from "@/app/ui/components/PageHeader";
import { ErrorState } from "@/app/ui/components/ErrorState";
import { ConfirmDialog } from "@/app/ui/components/ConfirmDialog";
import { toastError } from "@/app/lib/utils/toast";
import { LibraryTab } from "./LibraryTab";
import { DiscussionTab } from "./DiscussionTab";
import { MembersTab } from "./MembersTab";
import { ActivityTab } from "./ActivityTab";
import { AnnotationsTab } from "./AnnotationsTab";
import { RoleHelp } from "./RoleHelp";
import { useDocumentTitle } from "@/app/lib/hooks/useDocumentTitle";
import { ROUTES } from "@/app/lib/constants/routes.constants";

export default function GroupPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { data: group, error, isPending, refetch } = useGroup(id);
    useDocumentTitle(group?.name);
    const leave = useLeaveGroup();
    const remove = useDeleteGroup();
    const update = useUpdateGroup();
    const [editing, setEditing] = useState(false);
    const [tags, setTags] = useState("");
    // Tab and discussed paper live in the URL so notifications can link straight to a paper's thread
    const params = useSearchParams();
    const tabParam = params.get("tab");
    const tab: GroupTab = GROUP_TABS.find(t => t === tabParam) ?? "library";
    const discussPaper = params.get("paper");
    const show = (view: { tab: GroupTab; paper?: string }) =>
        router.replace(ROUTES.group(id, { tab: view.tab, paper: view.paper ?? discussPaper ?? undefined }), { scroll: false });
    const [confirm, setConfirm] = useState<"leave" | "delete" | null>(null);
    const back = <Link href={ROUTES.groups} className="inline-flex items-center gap-1 hover:text-foreground"><ArrowLeft className="size-4" /> Reading groups</Link>;

    if (isPending) return <PageContainer>{back}<Skeleton className="h-9 w-1/2" /><Skeleton className="h-40 w-full" /></PageContainer>;
    if (error || !group) return <PageContainer><div className="text-sm text-muted-foreground">{back}</div><ErrorState error={error} onRetry={() => refetch()} /></PageContainer>;

    const role = group.myRole;
    const isOwner = role === "OWNER";

    return (
        <PageContainer>
            <PageHeader
                back={back}
                title={group.name}
                description={<>
                    {group.description && <>{group.description} · </>}{group.memberCount} {group.memberCount === 1 ? "member" : "members"} · <span>You&apos;re {role === "ADMIN" || role === "OWNER" ? "an" : "a"} <Badge variant="secondary" className="capitalize">{role.toLowerCase()}</Badge></span> <RoleHelp />
                </>}
                actions={
                    <DropdownMenu>
                        <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label="Group actions"><MoreHorizontal /></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {atLeast(role, "ADMIN") && (
                                <>
                                    <DropdownMenuItem onClick={() => { setTags(group.tags.join(", ")); setEditing(true); }}><Pencil /> Edit details</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                </>
                            )}
                            {isOwner
                                ? <DropdownMenuItem variant="destructive" onClick={() => setConfirm("delete")}><Trash2 /> Delete group</DropdownMenuItem>
                                : <DropdownMenuItem onClick={() => setConfirm("leave")}><LogOut /> Leave group</DropdownMenuItem>}
                        </DropdownMenuContent>
                    </DropdownMenu>
                }
            />

            <Tabs value={tab} onValueChange={value => show({ tab: value as GroupTab })} className="gap-6">
                <TabsList variant="line">
                    <TabsTrigger value="library">Library</TabsTrigger>
                    <TabsTrigger value="discussion">Discussion</TabsTrigger>
                    <TabsTrigger value="annotations">Annotations</TabsTrigger>
                    <TabsTrigger value="members">Members</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>
                <TabsContent value="library">
                    <LibraryTab groupId={id} canRemove={atLeast(role, "ADMIN")} onDiscuss={paperId => show({ tab: "discussion", paper: paperId })} />
                </TabsContent>
                <TabsContent value="discussion"><DiscussionTab groupId={id} role={role} paperId={discussPaper} onPaperChange={paperId => show({ tab: "discussion", paper: paperId })} /></TabsContent>
                <TabsContent value="annotations"><AnnotationsTab groupId={id} /></TabsContent>
                <TabsContent value="members"><MembersTab groupId={id} role={role} /></TabsContent>
                <TabsContent value="activity"><ActivityTab groupId={id} /></TabsContent>
            </Tabs>

            <DetailsDialog
                open={editing}
                onOpenChange={setEditing}
                title="Edit group"
                submitLabel="Save"
                initial={{ name: group.name, description: group.description ?? "" }}
                pending={update.isPending}
                error={update.error}
                onSubmit={({ name, description }) => update.mutate({ groupId: id, name, description, tags: parseTags(tags) }, {
                    onSuccess: () => { setEditing(false); toast.success("Group updated"); },
                })}
            >
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                    <span>Topic tags <span className="font-normal text-muted-foreground">(comma separated)</span></span>
                    <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="ml, graphs" />
                </label>
            </DetailsDialog>
            <ConfirmDialog
                open={confirm !== null}
                onOpenChange={open => !open && setConfirm(null)}
                title={confirm === "delete" ? `Delete “${group.name}”?` : `Leave “${group.name}”?`}
                description={confirm === "delete"
                    ? "The group, its discussions, invites and group annotations are deleted for everyone."
                    : "You'll lose access to its papers, discussions and group annotations until someone invites you again."}
                confirmLabel={confirm === "delete" ? "Delete group" : "Leave group"}
                destructive
                pending={leave.isPending || remove.isPending}
                onConfirm={() => (confirm === "delete" ? remove : leave).mutate(id, {
                    onSuccess: () => { toast(confirm === "delete" ? "Group deleted" : "You left the group"); router.push(ROUTES.groups); },
                    onError: toastError,
                })}
            />
        </PageContainer>
    );
}
