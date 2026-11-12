'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/app/lib/providers/AuthProvider";
import { useLatestNotifications, useMarkAllRead, useMarkRead, useUnreadCount } from "@/app/api/notifications";
import { notificationLink, notificationText, timeAgo } from "@/app/lib/utils/notifications";
import { ROUTES } from "@/app/lib/constants/routes.constants";
import { cn } from "@/lib/utils";

export function Notifications() {
    const { user } = useAuth();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const unread = useUnreadCount();
    const latest = useLatestNotifications(open);
    const markRead = useMarkRead();
    const markAll = useMarkAllRead();

    if (!user) return null;

    const count = unread.data?.count ?? 0;

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon", className: "relative" })} aria-label={`Notifications${count ? `, ${count} unread` : ""}`}>
                <Bell />
                {count > 0 && (
                    <span className="absolute right-0 top-0 min-w-4 rounded-full bg-primary px-1 text-center text-[11px] font-semibold leading-4 text-primary-foreground" aria-hidden>
                        {count > 99 ? "99+" : count}
                    </span>
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuGroup>
                    <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                {latest.isPending && (
                    <div className="flex flex-col gap-2 p-2" aria-label="Loading notifications" role="status">
                        <Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" />
                    </div>
                )}
                {latest.data?.length === 0 && <DropdownMenuItem disabled>Nothing yet</DropdownMenuItem>}
                {latest.data?.map(n => (
                    <DropdownMenuItem
                        key={n.id}
                        className={cn("flex flex-col items-start gap-0.5", !n.read && "bg-highlight font-medium")}
                        onClick={() => {
                            if (!n.read) markRead.mutate(n.id);
                            router.push(notificationLink(n));
                        }}
                    >
                        <span className="whitespace-normal text-sm">{notificationText(n)}</span>
                        <span className="text-xs text-muted-foreground">{!n.read && <span className="font-semibold text-primary">New · </span>}{timeAgo(n.createdAt)}</span>
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                {count > 0 && <DropdownMenuItem onClick={() => markAll.mutate()}><CheckCheck /> Mark all read</DropdownMenuItem>}
                <DropdownMenuItem render={<Link href={ROUTES.notifications} />}>See all</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
