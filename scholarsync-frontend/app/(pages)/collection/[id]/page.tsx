'use client';

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Announcements, DndContext, DragEndEvent, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Archive, ArchiveRestore, ArrowLeft, Copy, Download, FileText, Link2, MoreHorizontal, Pencil, Trash2, FolderOpen } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    downloadExport, useCollection, useDeleteCollection, useRemoveFromCollection, useReorderCollection, useUpdateCollection, useUpdateEntry,
} from "@/app/api/collections";
import { reorder } from "@/app/lib/utils/array";
import { PageContainer } from "@/app/ui/components/PageContainer";
import { PageHeader } from "@/app/ui/components/PageHeader";
import { EmptyState } from "@/app/ui/components/EmptyState";
import { ErrorState } from "@/app/ui/components/ErrorState";
import { ConfirmDialog } from "@/app/ui/components/ConfirmDialog";
import { DetailsDialog } from "@/app/ui/components/DetailsDialog";
import { toastError } from "@/app/lib/utils/toast";
import { SortableEntry } from "./SortableEntry";
import { PaperOriginProvider } from "@/app/ui/components/PaperOrigin";
import { useUndoable } from "@/app/lib/hooks/useUndoable";
import { exitRow } from "@/app/lib/utils/motion";
import { useDocumentTitle } from "@/app/lib/hooks/useDocumentTitle";
import { ROUTES } from "@/app/lib/constants/routes.constants";

export default function CollectionPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { data, error, isPending, refetch } = useCollection(id);
    const update = useUpdateCollection();
    const remove = useDeleteCollection();
    const removePaper = useRemoveFromCollection();
    const updateEntry = useUpdateEntry();
    const reorderMutation = useReorderCollection(id);
    const [editing, setEditing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmShare, setConfirmShare] = useState(false);
    const undoable = useUndoable();
    useDocumentTitle(data?.collection.name);
    const sensors = useSensors(
        useSensor(PointerSensor),
        // Touch drags start after a short press, so a swipe over the handle still scrolls the page
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );
    const back = <Link href={ROUTES.collections} className="inline-flex items-center gap-1 hover:text-foreground"><ArrowLeft className="size-4" /> Collections</Link>;

    if (isPending) return <PageContainer>{back}<Skeleton className="h-9 w-1/2" /><Skeleton className="h-40 w-full" /></PageContainer>;
    if (error || !data) return <PageContainer><div className="text-sm text-muted-foreground">{back}</div><ErrorState error={error} onRetry={() => refetch()} /></PageContainer>;

    const { collection } = data;
    const entryKey = (paperId: string) => `collection:${id}:${paperId}`;
    const entries = data.entries.filter(e => !undoable.pending(entryKey(e.paper.id)));
    const ids = entries.map(e => e.paper.id);
    const titleOf = (paperId: string | number) => entries.find(e => e.paper.id === paperId)?.paper.title ?? "paper";
    const positionOf = (paperId: string | number) => ids.indexOf(String(paperId)) + 1;
    // The defaults read out raw paper ids
    const announcements: Announcements = {
        onDragStart: ({ active }) => `Picked up ${titleOf(active.id)}, position ${positionOf(active.id)} of ${ids.length}.`,
        onDragOver: ({ active, over }) => over ? `${titleOf(active.id)} is over position ${positionOf(over.id)} of ${ids.length}.` : `${titleOf(active.id)} is no longer over a position.`,
        onDragEnd: ({ active, over }) => over ? `${titleOf(active.id)} dropped at position ${positionOf(over.id)} of ${ids.length}.` : `${titleOf(active.id)} dropped.`,
        onDragCancel: ({ active }) => `Reordering cancelled. ${titleOf(active.id)} stays at position ${positionOf(active.id)}.`,
    };
    const shareUrl = collection.shareToken ? `${window.location.origin}${ROUTES.sharedCollection(collection.shareToken)}` : null;

    const onDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return;
        reorderMutation.mutate(reorder(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))), { onError: toastError });
    };
    const move = (index: number, delta: -1 | 1) => reorderMutation.mutate(reorder(ids, index, index + delta), { onError: toastError });

    const exportAs = (format: "bibtex" | "markdown") =>
        downloadExport(id, format, `${collection.name}.${format === "bibtex" ? "bib" : "md"}`).catch(toastError);

    const setShared = (shared: boolean) => update.mutate({ id, visibility: shared ? "PUBLIC_LINK" : "PRIVATE" }, {
        onSuccess: () => { setConfirmShare(false); toast(shared ? "Anyone with the link can now view this collection" : "Sharing turned off; the old link no longer works"); },
        onError: toastError,
    });

    return (
        <PageContainer>
            <PageHeader
                back={back}
                title={<span className="flex flex-wrap items-center gap-3">{collection.name}{collection.archived && <Badge variant="secondary">Archived</Badge>}</span>}
                description={collection.description ?? `${entries.length} ${entries.length === 1 ? "paper" : "papers"}`}
                actions={
                    <>
                        {!shareUrl && <Button variant="outline" onClick={() => setConfirmShare(true)}><Link2 /> Share</Button>}
                        <DropdownMenu>
                            <DropdownMenuTrigger className={buttonVariants({ variant: "outline" })}><Download /> Export</DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => exportAs("bibtex")}><FileText /> BibTeX (.bib)</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => exportAs("markdown")}><FileText /> Markdown (.md)</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenu>
                            <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label="More actions"><MoreHorizontal /></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditing(true)}><Pencil /> Edit details</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => update.mutate({ id, archived: !collection.archived }, {
                                    onSuccess: () => toast(collection.archived ? "Restored from archive" : "Moved to archive"), onError: toastError,
                                })}>
                                    {collection.archived ? <><ArchiveRestore /> Restore</> : <><Archive /> Archive</>}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={() => setDeleting(true)}><Trash2 /> Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </>
                }
            />

            {shareUrl && (
                <div className="flex flex-wrap items-center gap-3 border-y py-3">
                    <Link2 className="size-4 text-primary" aria-hidden />
                    <span className="text-sm font-medium">Anyone with this link can view</span>
                    <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1 text-xs">{shareUrl}</code>
                    <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(shareUrl).then(() => toast.success("Link copied"))}><Copy /> Copy</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShared(false)}>Stop sharing</Button>
                </div>
            )}

            {entries.length === 0 ? (
                <EmptyState icon={FolderOpen} title="No papers yet" description="Use the “Collection” button on any paper to add it here." action={<Link href={ROUTES.search} className={buttonVariants()}>Search papers</Link>} />
            ) : (
                <>
                    <p id="reorder-help" className="sr-only">Press Space to pick up the paper, the arrow keys to move it, and Space again to drop it. The Move up and Move down buttons do the same.</p>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} accessibility={{ announcements }}>
                        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                            <PaperOriginProvider value={`collection:${id}`}>
                            <ol className="flex flex-col divide-y border-y">
                                {entries.map((entry, index) => (
                                    <SortableEntry
                                        key={entry.paper.id}
                                        entry={entry}
                                        position={index}
                                        count={entries.length}
                                        saving={updateEntry.isPending && updateEntry.variables?.paperId === entry.paper.id}
                                        onMove={delta => move(index, delta)}
                                        onUpdate={patch => updateEntry.mutate({ id, paperId: entry.paper.id, ...patch }, { onError: toastError })}
                                        exitKey={entryKey(entry.paper.id)}
                                        onRemove={() => exitRow(entryKey(entry.paper.id), () => undoable.run({
                                            key: entryKey(entry.paper.id),
                                            message: "Removed from collection",
                                            commit: () => removePaper.mutate({ id, paperId: entry.paper.id }, { onError: toastError }),
                                        }))}
                                    />
                                ))}
                            </ol>
                            </PaperOriginProvider>
                        </SortableContext>
                    </DndContext>
                </>
            )}

            <DetailsDialog
                open={editing}
                onOpenChange={setEditing}
                title="Edit collection"
                submitLabel="Save"
                initial={{ name: collection.name, description: collection.description ?? "" }}
                pending={update.isPending}
                error={update.error}
                onSubmit={({ name, description }) => update.mutate({ id, name, description }, {
                    onSuccess: () => { setEditing(false); toast.success("Collection updated"); },
                })}
            />
            <ConfirmDialog
                open={confirmShare}
                onOpenChange={setConfirmShare}
                title="Share this collection by link?"
                description="Anyone with the link can see the collection's name, description and papers, without signing in. Your notes and tags stay private. You can stop sharing at any time."
                confirmLabel="Create link"
                pending={update.isPending}
                onConfirm={() => setShared(true)}
            />
            <ConfirmDialog
                open={deleting}
                onOpenChange={setDeleting}
                title={`Delete “${collection.name}”?`}
                description="The collection, its order, notes and tags are deleted. Papers stay in your library."
                confirmLabel="Delete collection"
                destructive
                pending={remove.isPending}
                onConfirm={() => remove.mutate(id, {
                    onSuccess: () => { toast("Collection deleted"); router.push(ROUTES.collections); },
                    onError: toastError,
                })}
            />
        </PageContainer>
    );
}
