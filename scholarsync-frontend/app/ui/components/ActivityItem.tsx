'use client';

import Link from "next/link";
import type { Schemas } from "@/app/api/client";
import { useMyGroups } from "@/app/api/groups";
import { timeAgo } from "@/app/lib/utils/notifications";
import { ROUTES } from "@/app/lib/constants/routes.constants";

type Activity = Schemas['ActivityResponse'];

const VERB: Record<Activity['type'], string> = {
    PAPER_ADDED: "shared",
    COMMENT_POSTED: "commented on",
    ANNOTATION_ADDED: "annotated",
    MEMBER_JOINED: "joined the group",
};

/** Where an activity row leads: the thread, the group's annotations, or the paper. */
function activityHref(item: Activity): string {
    switch (item.type) {
        case "COMMENT_POSTED": return ROUTES.group(item.groupId, { tab: "discussion", paper: item.paperId });
        case "ANNOTATION_ADDED": return ROUTES.group(item.groupId, { tab: "annotations" });
        default: return ROUTES.paper(item.paperId, `group:${item.groupId}`);
    }
}

/** One activity row; {@code showGroup} names the group, for feeds that mix several groups. */
export function ActivityItem({ item, showGroup = false }: { item: Activity; showGroup?: boolean }) {
    const { data: groupName } = useMyGroups(groups => groups.find(g => g.id === item.groupId)?.name);
    return (
        <li className="flex flex-col gap-0.5 py-2.5 text-sm">
            <p>
                <span className="font-medium">{item.actor?.name ?? "Someone"}</span> {VERB[item.type]}{" "}
                {item.paperId && (
                    <Link href={activityHref(item)} className="font-medium hover:underline">
                        {item.paperTitle ?? "a paper"}
                    </Link>
                )}
            </p>
            <p className="text-xs text-muted-foreground">
                {showGroup && groupName && <><Link href={ROUTES.group(item.groupId)} className="hover:text-foreground hover:underline">{groupName}</Link> · </>}
                <time dateTime={item.createdAt}>{timeAgo(item.createdAt)}</time>
            </p>
        </li>
    );
}
