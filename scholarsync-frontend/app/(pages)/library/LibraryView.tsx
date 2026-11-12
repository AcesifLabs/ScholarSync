'use client';

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Archive, BookMarked, ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLibrary, useRemovePaper, useUpdateLibraryItem } from "@/app/api/library";
import { useAddToCollection, useCollections } from "@/app/api/collections";
import { BULK_CONCURRENCY, LIBRARY_SORT_OPTIONS, READING_STATUSES, ReadingStatus } from "@/app/lib/constants/library.constants";
import { PaperCard, PaperList, ReadLink } from "@/app/ui/components/PaperCard";
import { PageContainer } from "@/app/ui/components/PageContainer";
import { PageHeader } from "@/app/ui/components/PageHeader";
import { EmptyState } from "@/app/ui/components/EmptyState";
import { ErrorState } from "@/app/ui/components/ErrorState";
import { PaperCardSkeleton } from "@/app/ui/components/Skeletons";
import { SimpleSelect } from "@/app/ui/components/SimpleSelect";
import { RowMenu } from "@/app/ui/components/RowMenu";
import { toastError } from "@/app/lib/utils/toast";
import { settleLimited } from "@/app/lib/utils/batch";
import { libraryParams, LibraryView as View, parseLibraryParams } from "@/app/lib/utils/library";
import { useUndoable } from "@/app/lib/hooks/useUndoable";
import { exitRow } from "@/app/lib/utils/motion";
import { PAGE_SIZE } from "@/app/lib/constants/pagination.constants";
import { ALL_OPTION } from "@/app/lib/constants/filters.constants";
import { pageCount } from "@/app/lib/utils/pagination";
import { ROUTES } from "@/app/lib/constants/routes.constants";

const libraryKey = (paperId: string) => `library:${paperId}`;
const NO_COLLECTION = "";

export function LibraryView() {
    const router = useRouter();
    const view = parseLibraryParams(useSearchParams());
    const { tab, sort, page } = view;
    const status = tab === ALL_OPTION ? undefined : tab;
    const { data, error, isPending, refetch } = useLibrary({ status, sort, page, size: PAGE_SIZE });
    const update = useUpdateLibraryItem();
    const remove = useRemovePaper();
    const addToCollection = useAddToCollection();
    const undoable = useUndoable();
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [bulkPending, setBulkPending] = useState(false);
    const [targetCollection, setTargetCollection] = useState(NO_COLLECTION);
    const collections = useCollections(false);

    const go = (patch: Partial<View>) => {
        setSelected(new Set());
        router.replace(`${ROUTES.library}?${libraryParams({ ...view, page: 0, ...patch })}`, { scroll: false });
    };
    const items = (data?.items ?? []).filter(item => !undoable.pending(libraryKey(item.paper.id)));
    const lastPage = data ? pageCount(data.total, PAGE_SIZE) - 1 : 0;
    // When the only item on a later page leaves it, step back a page instead of showing "empty"
    const afterLeave = () => { if (items.length === 1 && page > 0) go({ page: page - 1 }); };
    const statusLabel = READING_STATUSES.find(s => s.value === status)?.label.toLowerCase();
    // The status select shows the requested status while the change is in flight
    const shownStatus = (paperId: string, current: ReadingStatus) =>
        update.isPending && update.variables?.paperId === paperId && update.variables.status ? update.variables.status : current;

    const removeOne = (paperId: string) => exitRow(libraryKey(paperId), () => {
        undoable.run({
            key: libraryKey(paperId),
            message: "Removed from your library",
            commit: () => remove.mutate(paperId, { onError: toastError }),
        });
        afterLeave();
    });

    const allSelected = items.length > 0 && items.every(i => selected.has(i.paper.id));
    const toggle = (paperId: string, on: boolean) => setSelected(prev => {
        const next = new Set(prev);
        if (on) next.add(paperId); else next.delete(paperId);
        return next;
    });
    const bulk = async (label: string, fn: (paperId: string) => Promise<unknown>) => {
        setBulkPending(true);
        const { ok, failed } = await settleLimited([...selected], BULK_CONCURRENCY, fn);
        setBulkPending(false);
        setSelected(new Set());
        if (failed) toast.error(`${label} ${ok} of ${ok + failed} papers; ${failed} failed. Try again.`);
        else toast.success(`${label} ${ok} ${ok === 1 ? "paper" : "papers"}`);
    };
    const collectionOptions = [{ value: NO_COLLECTION, label: "Add to collection…" }, ...(collections.data ?? []).map(c => ({ value: c.id, label: c.name }))];

    return (
        <PageContainer>
            <PageHeader
                title="Library"
                description="Every paper you've saved, with where you are in it."
                actions={<SimpleSelect aria-label="Sort library" value={sort} options={LIBRARY_SORT_OPTIONS} onValueChange={value => go({ sort: value })} />}
            />

            <Tabs value={tab} onValueChange={value => go({ tab: value as View["tab"] })}>
                <TabsList variant="line">
                    <TabsTrigger value={ALL_OPTION}>All</TabsTrigger>
                    {READING_STATUSES.map(s => <TabsTrigger key={s.value} value={s.value}>{s.label}</TabsTrigger>)}
                </TabsList>
            </Tabs>

            {isPending && <PaperCardSkeleton count={3} />}
            {error && <ErrorState error={error} onRetry={() => refetch()} />}
            {data && items.length === 0 && (
                <EmptyState
                    icon={BookMarked}
                    title={status ? `No papers marked “${statusLabel}”` : "Your library is empty"}
                    description={status ? "Change a paper's status from the All tab." : "Save papers from search and they will appear here."}
                    action={!status && <Link href={ROUTES.search} className={buttonVariants()}>Search papers</Link>}
                />
            )}

            {items.length > 0 && (
                <div className="flex min-h-9 flex-wrap items-center gap-2 text-sm" role="toolbar" aria-label="Selected papers">
                    <label className="flex items-center gap-2 pr-2">
                        <Checkbox checked={allSelected} indeterminate={selected.size > 0 && !allSelected} onCheckedChange={on => setSelected(on ? new Set(items.map(i => i.paper.id)) : new Set())} />
                        {selected.size > 0 ? `${selected.size} selected` : "Select all"}
                    </label>
                    {selected.size > 0 && (
                        <>
                            <SimpleSelect<string>
                                size="sm"
                                aria-label="Set reading status of selected papers"
                                value={NO_COLLECTION}
                                options={[{ value: NO_COLLECTION, label: "Set status…" }, ...READING_STATUSES]}
                                onValueChange={next => next && bulk("Updated", paperId => update.mutateAsync({ paperId, status: next as ReadingStatus }))}
                            />
                            <SimpleSelect<string>
                                size="sm"
                                aria-label="Add selected papers to a collection"
                                value={targetCollection}
                                options={collectionOptions}
                                onValueChange={id => {
                                    setTargetCollection(NO_COLLECTION);
                                    if (id) void bulk("Added", paperId => addToCollection.mutateAsync({ id, paperId }));
                                }}
                            />
                            <Button variant="outline" size="sm" disabled={bulkPending} onClick={() => bulk("Archived", paperId => update.mutateAsync({ paperId, archived: true }))}>
                                <Archive /> Archive
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}><X /> Clear</Button>
                        </>
                    )}
                </div>
            )}

            {items.length > 0 && (
                <PaperList origin={"library"}>
                    {items.map(item => (
                        <div key={item.paper.id} data-exit={libraryKey(item.paper.id)} className="flex gap-3">
                            <Checkbox
                                className="mt-5"
                                aria-label={`Select ${item.paper.title}`}
                                checked={selected.has(item.paper.id)}
                                onCheckedChange={on => toggle(item.paper.id, on)}
                            />
                            <div className="min-w-0 flex-1">
                                <PaperCard
                                    paper={item.paper}
                                    actions={
                                        <>
                                            {item.paper.hasPdf && <ReadLink paperId={item.paper.id} />}
                                            <SimpleSelect
                                                size="sm"
                                                aria-label={`Reading status for ${item.paper.title}`}
                                                value={shownStatus(item.paper.id, item.status)}
                                                options={READING_STATUSES}
                                                onValueChange={next => update.mutate({ paperId: item.paper.id, status: next }, {
                                                    // In a status tab the paper leaves this list when its status changes
                                                    onSuccess: () => { if (status) afterLeave(); }, onError: toastError,
                                                })}
                                            />
                                            <RowMenu label={`More actions for ${item.paper.title}`} actions={[
                                                { label: "Archive", Icon: Archive, onClick: () => update.mutate({ paperId: item.paper.id, archived: true }, {
                                                    onSuccess: () => { afterLeave(); toast("Moved to archive"); }, onError: toastError,
                                                }) },
                                                { label: "Remove", Icon: Trash2, destructive: true, onClick: () => removeOne(item.paper.id) },
                                            ]} />
                                        </>
                                    }
                                />
                            </div>
                        </div>
                    ))}
                </PaperList>
            )}

            {lastPage > 0 && (
                <nav className="flex items-center justify-between gap-4" aria-label="Pagination">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => go({ page: page - 1 })}><ChevronLeft /> Previous</Button>
                    <span className="text-sm text-muted-foreground">Page {page + 1} of {lastPage + 1}</span>
                    <Button variant="outline" size="sm" disabled={page >= lastPage} onClick={() => go({ page: page + 1 })}>Next <ChevronRight /></Button>
                </nav>
            )}
        </PageContainer>
    );
}
