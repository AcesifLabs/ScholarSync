'use client';

import type { LucideIcon } from "lucide-react";
import { MoreHorizontal } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type Action = { label: string; Icon: LucideIcon; onClick: () => void; destructive?: boolean };

/** Secondary row actions: inline buttons from `sm` up, a "More" menu on phones so a row's actions fit one line. */
export function RowMenu({ actions, label }: { actions: Action[]; label: string }) {
    return (
        <>
            {actions.map(({ label: text, Icon, onClick }) => (
                <Button key={text} variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={onClick}><Icon /> {text}</Button>
            ))}
            <DropdownMenu>
                <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon-sm", className: "sm:hidden" })} aria-label={label}>
                    <MoreHorizontal />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {actions.map(({ label: text, Icon, onClick, destructive }) => (
                        <DropdownMenuItem key={text} variant={destructive ? "destructive" : "default"} onClick={onClick}><Icon /> {text}</DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}
