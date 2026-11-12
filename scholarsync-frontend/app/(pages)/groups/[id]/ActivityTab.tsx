'use client';

import { useState } from "react";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGroupActivity, useGroupPapers, useMembers } from "@/app/api/groups";
import { ActivityItem } from "@/app/ui/components/ActivityItem";
import { EmptyState } from "@/app/ui/components/EmptyState";
import { ErrorState } from "@/app/ui/components/ErrorState";
import { ListSkeleton } from "@/app/ui/components/Skeletons";
import { SimpleSelect } from "@/app/ui/components/SimpleSelect";
import { ALL_OPTION } from "@/app/lib/constants/filters.constants";

export function ActivityTab({ groupId }: { groupId: string }) {
    const [actorId, setActorId] = useState(ALL_OPTION);
    const [paperId, setPaperId] = useState(ALL_OPTION);
    const members = useMembers(groupId);
    const papers = useGroupPapers(groupId);
    const feed = useGroupActivity(groupId, { actorId: actorId === ALL_OPTION ? undefined : actorId, paperId: paperId === ALL_OPTION ? undefined : paperId });
    const items = feed.data?.pages.flat() ?? [];

    return (
        <section className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
                <SimpleSelect aria-label="Filter by member" value={actorId} onValueChange={setActorId}
                    options={[{ value: ALL_OPTION, label: "All members" }, ...(members.data ?? []).map(m => ({ value: m.user.id, label: m.user.name }))]} />
                <SimpleSelect aria-label="Filter by paper" className="max-w-xs" value={paperId} onValueChange={setPaperId}
                    options={[{ value: ALL_OPTION, label: "All papers" }, ...(papers.data ?? []).map(p => ({ value: p.paper.id, label: p.paper.title }))]} />
            </div>
            {feed.isPending && <ListSkeleton rows={4} />}
            {feed.error && <ErrorState error={feed.error} onRetry={() => feed.refetch()} />}
            {feed.isSuccess && items.length === 0 && <EmptyState compact icon={Activity} title="No activity yet" description="Shared papers, comments, annotations and new members show up here." />}
            {items.length > 0 && <ul className="flex flex-col divide-y *:enter rounded-xl border px-4">{items.map(item => <ActivityItem key={item.id} item={item} />)}</ul>}
            {feed.hasNextPage && (
                <Button variant="outline" className="self-start" disabled={feed.isFetchingNextPage} onClick={() => feed.fetchNextPage()}>Load more</Button>
            )}
        </section>
    );
}
