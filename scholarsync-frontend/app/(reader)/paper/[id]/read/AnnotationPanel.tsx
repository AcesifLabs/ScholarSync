'use client';

import React, { memo, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Download, Highlighter, MessageSquareReply, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import type { Schemas } from "@/app/api/client";
import { useAuth } from "@/app/lib/providers/AuthProvider";
import { useMyGroups } from "@/app/api/groups";
import { downloadAnnotations, useDeleteAnnotation, useDeleteReply, useReply, useResolveAnnotation, useUpdateAnnotation } from "@/app/api/annotations";
import { colorCss, colorLabel, PRIVATE_VISIBILITY } from "@/app/lib/constants/annotation.constants";
import { groupAnnotationsByPage } from "@/app/lib/utils/highlight";
import { timeAgo } from "@/app/lib/utils/notifications";
import { EmptyState } from "@/app/ui/components/EmptyState";
import { ErrorState } from "@/app/ui/components/ErrorState";
import { SimpleSelect } from "@/app/ui/components/SimpleSelect";
import { ConfirmDialog } from "@/app/ui/components/ConfirmDialog";
import { toastError } from "@/app/lib/utils/toast";
import { ALL_OPTION } from "@/app/lib/constants/filters.constants";
import { ANNOTATION_TEXT_MAX } from "@/app/lib/constants/limits.constants";
import type { PositionedAnnotation as Annotation } from "@/app/lib/types/annotation.types";
import { cn } from "@/lib/utils";

export type AnnotationFilter = { author: string; visibility: string };

type Props = {
    paperId: string;
    annotations: Annotation[];
    allAnnotations: Schemas['AnnotationResponse'][];
    selectedId: string | null;
    /** Bumped when a highlight in the PDF is clicked, so the matching card scrolls into view and takes focus. */
    focusToken: number;
    onSelect: (a: Annotation) => void;
    filter: AnnotationFilter;
    onFilter: (filter: AnnotationFilter) => void;
    error?: unknown;
    onRetry?: () => void;
};

/** Text box that sends with Ctrl/Cmd+Enter, used for replies and comment edits. */
function TextForm({ label, initial = "", submitLabel, onSubmit, onCancel, disabled }: {
    label: string; initial?: string; submitLabel: string; disabled: boolean;
    onSubmit: (body: string, done: () => void) => void; onCancel: () => void;
}) {
    const [body, setBody] = useState(initial);
    const submit = () => body.trim() !== initial.trim() && onSubmit(body.trim(), () => setBody(""));
    return (
        <form className="flex flex-col gap-1.5" onSubmit={e => { e.preventDefault(); submit(); }}>
            <Textarea
                autoFocus value={body} rows={2} maxLength={ANNOTATION_TEXT_MAX} aria-label={label} className="font-serif text-sm md:text-sm"
                onChange={e => setBody(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); } if (e.key === "Escape") onCancel(); }}
            />
            <div className="flex justify-end gap-1.5">
                <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
                <Button type="submit" size="sm" disabled={disabled || !body.trim()}>{submitLabel}</Button>
            </div>
        </form>
    );
}

/** Memoised: the reader re-renders on every page change, which this panel does not depend on. Pass stable callbacks. */
export const AnnotationPanel = memo(function AnnotationPanel({ paperId, annotations, allAnnotations, selectedId, focusToken, onSelect, filter, onFilter, error, onRetry }: Props) {
    const { user } = useAuth();
    const { data: groupNames } = useMyGroups(groups => new Map(groups.map(g => [g.id, g.name])));
    const reply = useReply(paperId);
    const deleteReply = useDeleteReply(paperId);
    const resolve = useResolveAnnotation(paperId);
    const update = useUpdateAnnotation(paperId);
    const remove = useDeleteAnnotation(paperId);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [replying, setReplying] = useState<string | null>(null);
    const [editing, setEditing] = useState<string | null>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const authors = [...new Map(allAnnotations.map(a => [a.author.id, a.author.name])).entries()];
    const groupIds = [...new Set(allAnnotations.map(a => a.groupId).filter(Boolean))];
    const visibilityLabel = (a: Annotation) => a.visibility === PRIVATE_VISIBILITY ? "Only you" : (groupNames?.get(a.groupId) ?? "Reading group");

    // A highlight clicked in the PDF brings its card into view and focus
    useEffect(() => {
        if (!focusToken || !selectedId) return;
        const card = listRef.current?.querySelector<HTMLElement>(`[data-annotation-id="${selectedId}"]`);
        card?.scrollIntoView({ block: "nearest" });
        card?.focus({ preventScroll: true });
    }, [focusToken, selectedId]);

    return (
        <div ref={listRef} className="flex flex-col gap-4 p-4 text-sm">
            <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">Annotations <span className="font-normal text-muted-foreground">({annotations.length})</span></h2>
                <Button variant="outline" size="sm" onClick={() => downloadAnnotations(paperId).catch(toastError)}><Download /> Export</Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <SimpleSelect
                    aria-label="Show annotations by"
                    className="w-full"
                    value={filter.author || ALL_OPTION}
                    onValueChange={value => onFilter({ ...filter, author: value === ALL_OPTION ? "" : value })}
                    options={[{ value: ALL_OPTION, label: "Everyone" }, ...authors.map(([id, name]) => ({ value: id, label: name }))]}
                />
                <SimpleSelect
                    aria-label="Show annotations shared with"
                    className="w-full"
                    value={filter.visibility || ALL_OPTION}
                    onValueChange={value => onFilter({ ...filter, visibility: value === ALL_OPTION ? "" : value })}
                    options={[
                        { value: ALL_OPTION, label: "All groups" },
                        { value: PRIVATE_VISIBILITY, label: "Only me" },
                        ...groupIds.map(id => ({ value: id, label: groupNames?.get(id) ?? "Reading group" })),
                    ]}
                />
            </div>
            {!!error && <ErrorState error={error} onRetry={onRetry} />}
            {!error && annotations.length === 0 && (
                <EmptyState compact icon={Highlighter} title="No annotations yet" description="Select text in the PDF, then choose Highlight (or press H)." />
            )}

            {[...groupAnnotationsByPage(annotations).entries()].map(([page, list]) => (
                <section key={page} className="flex flex-col gap-2" aria-label={`Page ${page}`}>
                    <h3 className="text-xs font-medium text-muted-foreground">Page {page}</h3>
                    {list.map(a => {
                        const mine = a.author.id === user?.id;
                        return (
                            <article
                                key={a.id}
                                data-annotation-id={a.id}
                                tabIndex={-1}
                                aria-label={`${colorLabel(a.color)} by ${a.author.name}`}
                                className={cn("enter flex flex-col gap-2 rounded-lg border bg-card p-3", selectedId === a.id && "border-ring ring-1 ring-ring")}
                            >
                                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                                    <span className="inline-flex items-center gap-1.5 font-medium">
                                        <span className="size-2.5 rounded-sm" style={{ background: colorCss(a.color) }} aria-hidden />
                                        {colorLabel(a.color)}
                                    </span>
                                    <span className="text-muted-foreground">{a.author.name} · {timeAgo(a.createdAt)} · {visibilityLabel(a)}</span>
                                    {a.resolved && <Badge variant="secondary">Resolved</Badge>}
                                </p>
                                {a.quote && (
                                    <button type="button" className={cn("reading line-clamp-3 text-left text-[0.9375rem] hover:text-foreground", a.resolved ? "text-muted-foreground" : "text-foreground/85")} onClick={() => onSelect(a)}>
                                        “{a.quote}”
                                    </button>
                                )}
                                {editing === a.id ? (
                                    <TextForm
                                        label="Edit comment" initial={a.comment ?? ""} submitLabel="Save" disabled={update.isPending}
                                        onCancel={() => setEditing(null)}
                                        onSubmit={body => update.mutate({ id: a.id, comment: body }, { onSuccess: () => setEditing(null), onError: toastError })}
                                    />
                                ) : a.comment && <p className="reading text-[0.9375rem] whitespace-pre-wrap">{a.comment}</p>}
                                {a.replies.length > 0 && (
                                    <ul className="flex flex-col gap-1.5 border-t pt-2">
                                        {a.replies.map(r => (
                                            <li key={r.id} className="flex items-start gap-1 text-xs">
                                                <p className="flex-1"><span className="font-semibold">{r.author.name}</span> <span className="text-sm">{r.body}</span></p>
                                                {r.author.id === user?.id && (
                                                    <Button variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-destructive" aria-label={`Delete your reply “${r.body.slice(0, 40)}”`}
                                                        onClick={() => deleteReply.mutate({ id: a.id, replyId: r.id }, { onError: toastError })}>
                                                        <X />
                                                    </Button>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {replying === a.id && (
                                    <TextForm label="Reply" submitLabel="Reply" disabled={reply.isPending} onCancel={() => setReplying(null)}
                                        onSubmit={(body, done) => reply.mutate({ id: a.id, body }, { onSuccess: () => { done(); setReplying(null); }, onError: toastError })} />
                                )}
                                <div className="flex flex-wrap gap-1">
                                    {replying !== a.id && <Button variant="ghost" size="sm" onClick={() => setReplying(a.id)}><MessageSquareReply /> Reply</Button>}
                                    <Button variant="ghost" size="sm" onClick={() => resolve.mutate({ id: a.id, resolved: !a.resolved }, {
                                        onSuccess: () => toast(a.resolved ? "Thread reopened" : "Thread resolved"), onError: toastError,
                                    })}>
                                        {a.resolved ? <><RotateCcw /> Reopen</> : <><CheckCircle2 /> Resolve</>}
                                    </Button>
                                    {mine && editing !== a.id && <Button variant="ghost" size="sm" onClick={() => setEditing(a.id)}><Pencil /> Edit</Button>}
                                    {mine && <Button variant="ghost" size="sm" onClick={() => setDeleting(a.id)}><Trash2 /> Delete</Button>}
                                </div>
                            </article>
                        );
                    })}
                </section>
            ))}

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={open => !open && setDeleting(null)}
                title="Delete this annotation?"
                description="The highlight, its comment and all replies are removed."
                confirmLabel="Delete annotation"
                destructive
                pending={remove.isPending}
                onConfirm={() => deleting && remove.mutate(deleting, { onSuccess: () => { setDeleting(null); toast("Annotation deleted"); }, onError: toastError })}
            />
        </div>
    );
});
