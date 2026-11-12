'use client';

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Bell, CheckCheck, FileText, MessageCircle, UserPlus, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { Schemas } from "@/app/api/client";
import { useMarkAllRead, useMarkRead, useNotificationPages, useUnreadCount } from "@/app/api/notifications";
import { notificationLink, notificationText, timeAgo } from "@/app/lib/utils/notifications";
import { PageContainer } from "@/app/ui/components/PageContainer";
import { PageHeader } from "@/app/ui/components/PageHeader";
import { EmptyState } from "@/app/ui/components/EmptyState";
import { ErrorState } from "@/app/ui/components/ErrorState";
import { ListSkeleton } from "@/app/ui/components/Skeletons";
import { toastError } from "@/app/lib/utils/toast";
import { cn } from "@/lib/utils";

const ICONS: Record<Schemas['NotificationResponse']['type'], LucideIcon> = {
    GROUP_ADDED: UserPlus,
    ANNOTATION_REPLY: MessageCircle,
    COMMENT_REPLY: MessageCircle,
    GROUP_PAPER_ADDED: FileText,
};

export default function NotificationsPage() {
    const [unreadOnly, setUnreadOnly] = useState(false);
    const pages = useNotificationPages(unreadOnly);
    const markRead = useMarkRead();
    const markAll = useMarkAllRead();
    const unreadCount = useUnreadCount().data?.count ?? 0;
    const items = pages.data?.pages.flat() ?? [];

    return (
        <PageContainer>
            <PageHeader
                title="Notifications"
                actions={
                    <>
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <Checkbox checked={unreadOnly} onCheckedChange={checked => setUnreadOnly(checked === true)} /> Unread only
                        </label>
                        {unreadCount > 0 && (
                            <Button variant="outline" size="sm" onClick={() => markAll.mutate(undefined, { onSuccess: () => toast("All caught up"), onError: toastError })}>
                                <CheckCheck /> Mark all read
                            </Button>
                        )}
                    </>
                }
            />

            {pages.isPending && <ListSkeleton rows={5} />}
            {pages.error && <ErrorState error={pages.error} onRetry={() => pages.refetch()} />}
            {pages.isSuccess && items.length === 0 && (
                <EmptyState icon={Bell} title={unreadOnly ? "No unread notifications" : "No notifications yet"} description="You'll hear about replies, shared papers and group invitations here." />
            )}

            {items.length > 0 && (
                <ul className="flex flex-col divide-y *:enter border-y">
                    {items.map(n => {
                        const Icon = ICONS[n.type];
                        return (
                            <li key={n.id}>
                                <Link
                                    href={notificationLink(n)}
                                    onClick={() => !n.read && markRead.mutate(n.id)}
                                    className={cn("-mx-2 flex items-start gap-3 rounded-md px-2 py-3 transition-colors hover:bg-accent/60 focus-visible:-outline-offset-2", !n.read && "bg-highlight")}
                                >
                                    <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                                    <span className={cn("flex-1 text-sm", !n.read && "font-semibold")}>{notificationText(n)}</span>
                                    <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                                        {!n.read && <span className="font-semibold text-primary">New</span>}
                                        {timeAgo(n.createdAt)}
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}

            {pages.hasNextPage && (
                <Button variant="outline" className="self-start" disabled={pages.isFetchingNextPage} onClick={() => pages.fetchNextPage()}>Load more</Button>
            )}
        </PageContainer>
    );
}
