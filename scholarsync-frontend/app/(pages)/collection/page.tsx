'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { FolderOpen, Link2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCollections, useCreateCollection } from "@/app/api/collections";
import { timeAgo } from "@/app/lib/utils/notifications";
import { PageContainer } from "@/app/ui/components/PageContainer";
import { PageHeader } from "@/app/ui/components/PageHeader";
import { EmptyState } from "@/app/ui/components/EmptyState";
import { ErrorState } from "@/app/ui/components/ErrorState";
import { ListSkeleton } from "@/app/ui/components/Skeletons";
import { DetailsDialog } from "@/app/ui/components/DetailsDialog";
import { ROUTES } from "@/app/lib/constants/routes.constants";

export default function CollectionsPage() {
    const router = useRouter();
    const { data: collections, error, isPending, refetch } = useCollections();
    const create = useCreateCollection();
    const [open, setOpen] = useState(false);

    const newButton = <Button onClick={() => setOpen(true)}><Plus /> New collection</Button>;

    return (
        <PageContainer>
            <PageHeader title="Collections" description="Named, ordered reading lists with notes and tags. Export them as BibTeX or share them by link." actions={collections?.length ? newButton : undefined} />

            {isPending && <ListSkeleton rows={3} />}
            {error && <ErrorState error={error} onRetry={() => refetch()} />}
            {collections?.length === 0 && (
                <EmptyState icon={FolderOpen} title="No collections yet" description="Group papers for a chapter, a course or a project, then export them as BibTeX." action={newButton} />
            )}

            {!!collections?.length && <ul className="flex flex-col divide-y *:enter border-y">
                {collections.map(c => (
                    <li key={c.id}>
                        <Link href={ROUTES.collection(c.id)} className="flex flex-col gap-1 rounded-md px-2 py-3 -mx-2 transition-colors hover:bg-accent/60">
                            <div className="flex items-center gap-2">
                                <h2 className="font-semibold">{c.name}</h2>
                                {c.visibility === "PUBLIC_LINK" && <Badge variant="secondary"><Link2 /> Shared</Badge>}
                            </div>
                            {c.description && <p className="line-clamp-1 text-sm text-muted-foreground">{c.description}</p>}
                            <p className="text-xs text-muted-foreground">
                                {c.paperCount} {c.paperCount === 1 ? "paper" : "papers"} · updated {timeAgo(c.updatedAt)}
                            </p>
                        </Link>
                    </li>
                ))}
            </ul>}

            <DetailsDialog
                open={open}
                onOpenChange={setOpen}
                title="New collection"
                submitLabel="Create collection"
                pending={create.isPending}
                error={create.error}
                onSubmit={({ name, description }) => create.mutate({ name, description: description || undefined }, {
                    onSuccess: created => { setOpen(false); toast.success(`Created “${created.name}”`); router.push(ROUTES.collection(created.id)); },
                })}
            />
        </PageContainer>
    );
}
