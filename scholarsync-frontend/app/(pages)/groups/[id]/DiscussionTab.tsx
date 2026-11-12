'use client';

import React, { memo, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { BookOpen, MessagesSquare } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Schemas } from "@/app/api/client";
import { useComments, useDeleteComment, useEditComment, useGroupPapers, usePostComment } from "@/app/api/groups";
import type { GroupRole } from "@/app/lib/constants/group.constants";
import { atLeast } from "@/app/lib/utils/groups";
import { useAuth } from "@/app/lib/providers/AuthProvider";
import { buildCommentTree, CommentNode } from "@/app/lib/utils/comments";
import { timeAgo } from "@/app/lib/utils/notifications";
import { Avatar } from "@/app/ui/components/Avatar";
import { EmptyState } from "@/app/ui/components/EmptyState";
import { ErrorState } from "@/app/ui/components/ErrorState";
import { ListSkeleton } from "@/app/ui/components/Skeletons";
import { SimpleSelect } from "@/app/ui/components/SimpleSelect";
import { ConfirmDialog } from "@/app/ui/components/ConfirmDialog";
import { toastError } from "@/app/lib/utils/toast";
import { COMMENT_MAX } from "@/app/lib/constants/limits.constants";
import { ROUTES } from "@/app/lib/constants/routes.constants";

/** Reply levels that indent; deeper replies line up with their parent. */
const MAX_INDENT = 3;

type Props = { groupId: string; role: GroupRole; paperId: string | null; onPaperChange: (paperId: string) => void };
type Comment = Schemas['CommentResponse'];

/** Parsing Markdown is the costly part of a thread; skip it unless this comment's text changed. */
const MarkdownBody = memo(function MarkdownBody({ text }: { text: string }) {
    return (
        <div className="reading">
            <ReactMarkdown>{text}</ReactMarkdown>
        </div>
    );
});

function Composer({ onSubmit, placeholder, initial = "", busy, onCancel, submitLabel = "Post" }: {
    onSubmit: (body: string, reset: () => void) => void; placeholder: string; initial?: string; busy: boolean; onCancel?: () => void; submitLabel?: string;
}) {
    const [body, setBody] = useState(initial);
    return (
        <form className="flex flex-col gap-2" onSubmit={e => { e.preventDefault(); if (body.trim()) onSubmit(body.trim(), () => setBody("")); }}>
            <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder={placeholder} rows={3} maxLength={COMMENT_MAX} aria-label={placeholder} />
            <div className="flex items-center gap-2">
                <Button type="submit" size="sm" disabled={busy || !body.trim()}>{submitLabel}</Button>
                {onCancel && <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>}
                <span className="ml-auto text-xs text-muted-foreground">Markdown supported</span>
            </div>
        </form>
    );
}

export function DiscussionTab({ groupId, role, paperId, onPaperChange }: Props) {
    const { user } = useAuth();
    const papers = useGroupPapers(groupId);
    // The paper picked in the Library tab may since have been removed from the group
    const selected = papers.data?.some(p => p.paper.id === paperId) ? paperId : papers.data?.[0]?.paper.id ?? null;
    const comments = useComments(groupId, selected);
    const post = usePostComment();
    const edit = useEditComment();
    const remove = useDeleteComment();
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const [editing, setEditing] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const canWrite = atLeast(role, "MEMBER");
    const canModerate = atLeast(role, "ADMIN");
    const tree = useMemo(() => buildCommentTree(comments.data ?? []), [comments.data]);

    if (papers.isPending) return <ListSkeleton rows={3} />;
    if (papers.error) return <ErrorState error={papers.error} onRetry={() => papers.refetch()} />;
    if (papers.data.length === 0 || !selected) {
        return <EmptyState icon={MessagesSquare} title="Nothing to discuss yet" description="Share a paper with the group (the “Group” button on any paper), then start a thread about it here." action={<Link href={ROUTES.search} className={buttonVariants({ size: "sm" })}>Find a paper</Link>} />;
    }

    // Indentation stops after a few levels so deep threads stay readable on narrow screens
    const renderNode = (node: CommentNode<Comment>, depth = 0): React.ReactNode => (
        <li key={node.id} className="flex flex-col gap-2">
            <div className="flex gap-3">
                <Avatar name={node.author.name} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{node.author.name}</span> · {timeAgo(node.createdAt)}{node.editedAt && " · edited"}
                    </p>
                    {node.deleted ? <p className="text-sm italic text-muted-foreground">This comment was deleted.</p> : editing === node.id ? (
                        <Composer initial={node.bodyMd ?? ""} placeholder="Edit comment" submitLabel="Save" busy={edit.isPending} onCancel={() => setEditing(null)}
                            onSubmit={bodyMd => edit.mutate({ groupId, commentId: node.id, bodyMd }, { onSuccess: () => setEditing(null), onError: toastError })} />
                    ) : (
                        <MarkdownBody text={node.bodyMd ?? ""} />
                    )}
                    {!node.deleted && editing !== node.id && (
                        <div className="-ml-2 flex gap-1">
                            {canWrite && <Button variant="ghost" size="xs" aria-expanded={replyTo === node.id} onClick={() => setReplyTo(replyTo === node.id ? null : node.id)}>Reply</Button>}
                            {node.author.id === user?.id && <Button variant="ghost" size="xs" className="text-muted-foreground" onClick={() => setEditing(node.id)}>Edit</Button>}
                            {(node.author.id === user?.id || canModerate) && <Button variant="ghost" size="xs" className="text-muted-foreground hover:text-destructive" onClick={() => setDeleting(node.id)}>Delete</Button>}
                        </div>
                    )}
                    {replyTo === node.id && (
                        <div className="animate-in fade-in-0 slide-in-from-top-1 motion-quick"><Composer placeholder="Write a reply" busy={post.isPending} onCancel={() => setReplyTo(null)}
                            onSubmit={bodyMd => post.mutate({ groupId, paperId: selected, bodyMd, parentId: node.id }, { onSuccess: () => setReplyTo(null), onError: toastError })} /></div>
                    )}
                </div>
            </div>
            {node.children.length > 0 && (
                <ul className={depth < MAX_INDENT ? "ml-4 flex flex-col gap-4 border-l pl-4" : "flex flex-col gap-4"}>
                    {node.children.map(child => renderNode(child, depth + 1))}
                </ul>
            )}
        </li>
    );

    return (
        <section className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">Paper</span>
                <SimpleSelect
                    aria-label="Paper to discuss"
                    className="max-w-full min-w-0 sm:max-w-md"
                    value={selected}
                    options={papers.data.map(p => ({ value: p.paper.id, label: p.paper.title }))}
                    onValueChange={onPaperChange}
                />
                <Link href={ROUTES.paperRead(selected)} className={buttonVariants({ variant: "outline", size: "sm" })}><BookOpen /> Read and annotate</Link>
            </div>

            {comments.isPending && <ListSkeleton rows={2} />}
            {comments.error && <ErrorState error={comments.error} onRetry={() => comments.refetch()} />}
            {comments.data?.length === 0 && <EmptyState compact icon={MessagesSquare} title="No comments yet" description={canWrite ? "Start the discussion below." : "Members' comments will appear here."} />}
            {!!comments.data?.length && <ul className="flex flex-col gap-5">{tree.map(node => renderNode(node))}</ul>}

            {!canWrite && <p className="text-sm text-muted-foreground">You&apos;re a viewer in this group, so you can read the discussion but not post. An admin can change your role.</p>}
            {canWrite && (
                <div className="border-t pt-4">
                    {/* Keyed by paper so a half-written draft is never posted to a different paper's thread */}
                    <Composer key={selected} placeholder="Start a new thread" busy={post.isPending} onSubmit={(bodyMd, reset) => post.mutate({ groupId, paperId: selected, bodyMd }, { onSuccess: reset, onError: toastError })} />
                </div>
            )}

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={open => !open && setDeleting(null)}
                title="Delete this comment?"
                description="Replies stay visible under a “deleted” placeholder."
                confirmLabel="Delete comment"
                destructive
                pending={remove.isPending}
                onConfirm={() => deleting && remove.mutate({ groupId, commentId: deleting }, { onSuccess: () => setDeleting(null), onError: toastError })}
            />
        </section>
    );
}
