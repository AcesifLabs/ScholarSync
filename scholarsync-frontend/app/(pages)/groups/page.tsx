'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useCreateGroup, useMyGroups } from "@/app/api/groups";
import { parseTags } from "@/app/lib/utils/array";
import { PageContainer } from "@/app/ui/components/PageContainer";
import { PageHeader } from "@/app/ui/components/PageHeader";
import { EmptyState } from "@/app/ui/components/EmptyState";
import { ErrorState } from "@/app/ui/components/ErrorState";
import { ListSkeleton } from "@/app/ui/components/Skeletons";
import { DetailsDialog } from "@/app/ui/components/DetailsDialog";
import { ROUTES } from "@/app/lib/constants/routes.constants";

export default function GroupsPage() {
    const router = useRouter();
    const { data: groups, error, isPending, refetch } = useMyGroups();
    const create = useCreateGroup();
    const [open, setOpen] = useState(false);
    const [tags, setTags] = useState("");

    const newButton = <Button onClick={() => { setTags(""); setOpen(true); }}><Plus /> New group</Button>;

    return (
        <PageContainer>
            <PageHeader title="Reading groups" description="Read, annotate and discuss papers with your lab or class." actions={groups?.length ? newButton : undefined} />

            {isPending && <ListSkeleton rows={3} />}
            {error && <ErrorState error={error} onRetry={() => refetch()} />}
            {groups?.length === 0 && (
                <EmptyState icon={Users} title="You're not in any groups yet" description="Start a group and invite people, or open an invite link someone sent you." action={newButton} />
            )}

            {!!groups?.length && <ul className="flex flex-col divide-y *:enter border-y">
                {groups.map(g => (
                    <li key={g.id}>
                        <Link href={ROUTES.group(g.id)} className="flex flex-col gap-1 rounded-md px-2 py-3 -mx-2 transition-colors hover:bg-accent/60">
                            <div className="flex items-center gap-2">
                                <h2 className="font-semibold">{g.name}</h2>
                                <Badge variant="secondary" className="capitalize">{g.myRole.toLowerCase()}</Badge>
                            </div>
                            {g.description && <p className="line-clamp-1 text-sm text-muted-foreground">{g.description}</p>}
                            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                <span>{g.memberCount} {g.memberCount === 1 ? "member" : "members"}</span>
                                {g.tags.map(t => <Badge key={t} variant="outline">{t}</Badge>)}
                            </p>
                        </Link>
                    </li>
                ))}
            </ul>}

            <DetailsDialog
                open={open}
                onOpenChange={setOpen}
                title="New reading group"
                description="You'll be the owner. Invite members from the group page."
                submitLabel="Create group"
                pending={create.isPending}
                error={create.error}
                onSubmit={({ name, description }) => create.mutate({ name, description: description || undefined, tags: parseTags(tags) }, {
                    onSuccess: created => { setOpen(false); toast.success(`Created “${created.name}”`); router.push(ROUTES.group(created.id)); },
                })}
            >
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                    <span>Topic tags <span className="font-normal text-muted-foreground">(comma separated)</span></span>
                    <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="ml, graphs" />
                </label>
            </DetailsDialog>
        </PageContainer>
    );
}
