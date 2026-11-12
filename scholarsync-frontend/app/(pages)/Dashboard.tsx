'use client';

import Link from "next/link";
import React from "react";
import { BookOpen, CheckCircle2, Circle, Search } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Schemas } from "@/app/api/client";
import { useLibrary } from "@/app/api/library";
import { useMyActivity, useMyGroups } from "@/app/api/groups";
import { useCollections } from "@/app/api/collections";
import { useUnreadCount } from "@/app/api/notifications";
import { useAuth } from "@/app/lib/providers/AuthProvider";
import { formatAuthors } from "@/app/lib/utils/text";
import { timeAgo } from "@/app/lib/utils/notifications";
import { ActivityItem } from "@/app/ui/components/ActivityItem";
import { openSearch } from "@/app/ui/components/SearchDialog";
import { ErrorState } from "@/app/ui/components/ErrorState";
import { ListSkeleton } from "@/app/ui/components/Skeletons";
import { ROUTES } from "@/app/lib/constants/routes.constants";
import { DASHBOARD_ACTIVITY_LIMIT, DASHBOARD_COLLECTION_LIMIT, DASHBOARD_PAPER_LIMIT } from "@/app/lib/constants/pagination.constants";

type LibraryItem = Schemas['LibraryItemResponse'];

function Section({ title, href, action = "View all", children }: { title: string; href: string; action?: string; children: React.ReactNode }) {
    const id = `section-${title.toLowerCase().replace(/\W+/g, "-")}`;
    return (
        <section className="flex min-w-0 flex-col gap-1" aria-labelledby={id}>
            <div className="flex items-baseline justify-between gap-2 border-b pb-2">
                <h2 id={id} className="text-sm font-semibold">{title}</h2>
                <Link href={href} className="text-sm text-muted-foreground hover:text-foreground hover:underline">{action}</Link>
            </div>
            {children}
        </section>
    );
}

/** A quiet one-line empty state, so the section heading stays the strongest element. */
function EmptyLine({ children }: { children: React.ReactNode }) {
    return <p className="py-3 text-sm text-muted-foreground">{children}</p>;
}

const inlineLink = "font-medium text-foreground underline-offset-4 hover:underline";

/** First-run checklist, shown instead of two empty sections while the account has no collections or groups. */
function GetStarted({ hasPapers }: { hasPapers: boolean }) {
    const steps = [
        { done: hasPapers, label: "Save a paper to your library", href: ROUTES.search },
        { done: false, label: "Create a collection for a project or course", href: ROUTES.collections },
        { done: false, label: "Join or start a reading group", href: ROUTES.groups },
    ];
    return (
        <section className="flex min-w-0 flex-col gap-1" aria-labelledby="section-get-started">
            <div className="border-b pb-2"><h2 id="section-get-started" className="text-sm font-semibold">Get started</h2></div>
            <ul className="flex flex-col divide-y *:enter">
                {steps.map(step => (
                    <li key={step.label} className="flex items-center gap-3 py-2.5 text-sm">
                        {step.done
                            ? <CheckCircle2 className="size-4 shrink-0 text-primary" aria-label="Done" />
                            : <Circle className="size-4 shrink-0 text-muted-foreground" aria-label="To do" />}
                        {step.done
                            ? <span className="text-muted-foreground line-through">{step.label}</span>
                            : <Link href={step.href} className={inlineLink}>{step.label}</Link>}
                    </li>
                ))}
            </ul>
        </section>
    );
}

/** Renders the loading, error and empty states of a list query, or the rows. */
function ListBody<T>({ query, rows, empty, children }: {
    query: { isPending: boolean; error: unknown; refetch: () => unknown }; rows: T[] | undefined; empty: React.ReactNode; children: (rows: T[]) => React.ReactNode;
}) {
    if (query.isPending) return <ListSkeleton rows={3} />;
    if (query.error) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
    if (!rows?.length) return <>{empty}</>;
    return <ul className="flex flex-col divide-y *:enter">{children(rows)}</ul>;
}

function ReadingRow({ item }: { item: LibraryItem }) {
    const { paper } = item;
    const stoppedOn = item.lastPage && item.lastPage > 1 ? item.lastPage : null;
    return (
        <li className="flex items-center gap-4 py-3">
            <div className="min-w-0 flex-1">
                <Link href={ROUTES.paper(paper.id, "library")} className="line-clamp-2 font-medium hover:underline">{paper.title}</Link>
                <p className="truncate text-xs text-muted-foreground">
                    {formatAuthors(paper.authors)}{paper.year && ` · ${paper.year}`}
                    {stoppedOn ? ` · stopped on page ${stoppedOn}` : ` · added ${timeAgo(item.addedAt)}`}
                </p>
            </div>
            {paper.hasPdf && (
                <Link href={ROUTES.paperRead(paper.id, { page: stoppedOn ?? undefined })} className={buttonVariants({ variant: "outline", size: "sm", className: "shrink-0" })}>
                    <BookOpen /> {stoppedOn ? "Resume" : "Read"}
                </Link>
            )}
        </li>
    );
}

export function DashboardSkeleton() {
    return (
        <div className="flex flex-col gap-8" aria-hidden>
            <div className="flex flex-col gap-2"><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-80" /></div>
            <div className="grid gap-10 lg:grid-cols-[3fr_2fr]">
                {[0, 1].map(i => <div key={i} className="flex flex-col gap-3"><Skeleton className="h-5 w-40" /><ListSkeleton rows={4} /></div>)}
            </div>
        </div>
    );
}

/** Home for a signed-in reader: what they're reading, what's next, and what their groups are doing. */
export function Dashboard() {
    const { user } = useAuth();
    const inProgress = useLibrary({ status: "IN_PROGRESS", sort: "updated", size: DASHBOARD_PAPER_LIMIT });
    const upNext = useLibrary({ status: "TO_READ", sort: "added", size: DASHBOARD_PAPER_LIMIT });
    const activity = useMyActivity(DASHBOARD_ACTIVITY_LIMIT);
    const collections = useCollections();
    const groups = useMyGroups();
    const unread = useUnreadCount().data?.count ?? 0;
    const firstName = user?.name?.split(/\s+/)[0];

    const loaded = inProgress.data && upNext.data;
    const summary = !loaded ? "" : [
        inProgress.data.total > 0 && `${inProgress.data.total} in progress`,
        upNext.data.total > 0 && `${upNext.data.total} to read`,
    ].filter(Boolean).join(" · ") || "Your library is empty";
    const newAccount = collections.data?.length === 0 && groups.data?.length === 0;

    return (
        <div className="flex flex-col gap-10">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-1">
                    <h1 className="text-2xl font-semibold tracking-tight">{firstName ? `Welcome back, ${firstName}` : "Welcome back"}</h1>
                    <p className="min-h-5 text-sm text-muted-foreground">
                        {summary}
                        {unread > 0 && <> · <Link href={ROUTES.notifications} className={inlineLink}>{unread} unread {unread === 1 ? "notification" : "notifications"}</Link></>}
                    </p>
                </div>
                <Button onClick={openSearch}><Search /> Search papers</Button>
            </header>

            <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[3fr_2fr]">
                <div className="flex min-w-0 flex-col gap-10">
                    <Section title="Continue reading" href={`${ROUTES.library}?status=IN_PROGRESS`}>
                        <ListBody query={inProgress} rows={inProgress.data?.items}
                            empty={<EmptyLine>Nothing in progress. Papers you read past the first page appear here.</EmptyLine>}>
                            {rows => rows.map(item => <ReadingRow key={item.paper.id} item={item} />)}
                        </ListBody>
                    </Section>
                    <Section title="Up next" href={`${ROUTES.library}?status=TO_READ`}>
                        <ListBody query={upNext} rows={upNext.data?.items}
                            empty={<EmptyLine>Nothing to read yet. <button type="button" onClick={openSearch} className={inlineLink}>Find papers</button> to save.</EmptyLine>}>
                            {rows => rows.map(item => <ReadingRow key={item.paper.id} item={item} />)}
                        </ListBody>
                    </Section>
                </div>

                <div className="flex min-w-0 flex-col gap-10">
                    {newAccount ? <GetStarted hasPapers={(inProgress.data?.total ?? 0) + (upNext.data?.total ?? 0) > 0} /> : <>
                    <Section title="In your reading groups" href={ROUTES.groups}>
                        <ListBody query={activity} rows={activity.data}
                            empty={<EmptyLine>No group activity yet. <Link href={ROUTES.groups} className={inlineLink}>Join or start a reading group</Link>.</EmptyLine>}>
                            {rows => rows.map(item => <ActivityItem key={item.id} item={item} showGroup />)}
                        </ListBody>
                    </Section>
                    <Section title="Collections" href={ROUTES.collections}>
                        <ListBody query={collections} rows={collections.data?.slice(0, DASHBOARD_COLLECTION_LIMIT)}
                            empty={<EmptyLine>No collections yet. <Link href={ROUTES.collections} className={inlineLink}>Create one</Link> for a chapter, a course or a project.</EmptyLine>}>
                            {rows => rows.map(c => (
                                <li key={c.id} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
                                    <Link href={ROUTES.collection(c.id)} className="min-w-0 truncate font-medium hover:underline">{c.name}</Link>
                                    <span className="shrink-0 text-xs text-muted-foreground">{c.paperCount} {c.paperCount === 1 ? "paper" : "papers"} · {timeAgo(c.updatedAt)}</span>
                                </li>
                            ))}
                        </ListBody>
                    </Section>
                    </>}
                </div>
            </div>
        </div>
    );
}
