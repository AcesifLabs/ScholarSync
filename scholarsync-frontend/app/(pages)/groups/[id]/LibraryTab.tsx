'use client';

import Link from "next/link";
import { BookOpen, LibraryBig, MessagesSquare, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useGroupPapers, useRemoveGroupPaper } from "@/app/api/groups";
import { PaperCard, PaperList } from "@/app/ui/components/PaperCard";
import { SaveButton } from "@/app/ui/components/SaveButton";
import { AddToCollectionButton } from "@/app/ui/components/AddToCollectionButton";
import { EmptyState } from "@/app/ui/components/EmptyState";
import { ErrorState } from "@/app/ui/components/ErrorState";
import { PaperCardSkeleton } from "@/app/ui/components/Skeletons";
import { timeAgo } from "@/app/lib/utils/notifications";
import { toastError } from "@/app/lib/utils/toast";
import { useUndoable } from "@/app/lib/hooks/useUndoable";
import { exitRow } from "@/app/lib/utils/motion";
import { RowMenu } from "@/app/ui/components/RowMenu";
import { ROUTES } from "@/app/lib/constants/routes.constants";

type Props = { groupId: string; canRemove: boolean; onDiscuss: (paperId: string) => void };

export function LibraryTab({ groupId, canRemove, onDiscuss }: Props) {
    const { data: papers, error, isPending, refetch } = useGroupPapers(groupId);
    const remove = useRemoveGroupPaper();
    const undoable = useUndoable();
    const key = (paperId: string) => `group:${groupId}:${paperId}`;

    if (isPending) return <PaperCardSkeleton count={2} />;
    if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
    const shown = papers.filter(entry => !undoable.pending(key(entry.paper.id)));
    if (shown.length === 0) {
        return <EmptyState icon={LibraryBig} title="No shared papers yet" description="Use the “Group” button on any paper to share it here." action={<Link href={ROUTES.search} className={buttonVariants()}>Search papers</Link>} />;
    }

    return (
        <PaperList origin={`group:${groupId}`}>
            {shown.map(entry => (
                <PaperCard
                    key={entry.paper.id}
                    paper={entry.paper}
                    exitKey={key(entry.paper.id)}
                    actions={
                        <>
                            <Link href={ROUTES.paperRead(entry.paper.id)} className={buttonVariants({ variant: "outline", size: "sm" })}><BookOpen /> Read</Link>
                            <Button variant="outline" size="sm" onClick={() => onDiscuss(entry.paper.id)}><MessagesSquare /> Discuss</Button>
                            <SaveButton paperId={entry.paper.id} />
                            <AddToCollectionButton paperId={entry.paper.id} />
                            {canRemove && (
                                <RowMenu label={`More actions for ${entry.paper.title}`} actions={[{
                                    label: "Remove", Icon: Trash2, destructive: true, onClick: () => exitRow(key(entry.paper.id), () => undoable.run({
                                        key: key(entry.paper.id),
                                        message: "Removed from the group, with its discussion and group annotations",
                                        commit: () => remove.mutate({ groupId, paperId: entry.paper.id }, { onError: toastError }),
                                    })),
                                }]} />
                            )}
                        </>
                    }
                    footer={entry.addedBy && <p className="text-xs text-muted-foreground">Shared by {entry.addedBy.name} · {timeAgo(entry.addedAt)}</p>}
                />
            ))}
        </PaperList>
    );
}
