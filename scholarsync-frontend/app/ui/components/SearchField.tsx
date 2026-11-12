import React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = { onSubmit: (event: React.FormEvent) => void; large?: boolean; className?: string; children: React.ReactNode };

/** The bordered search box shell (icon, field, optional button) shared by paper and researcher search. */
export function SearchField({ onSubmit, large, className, children }: Props) {
    return (
        <form
            role="search"
            onSubmit={onSubmit}
            className={cn(
                "relative flex w-full items-center rounded-lg border border-input bg-background transition-shadow focus-within:border-ring focus-within:ring-2 focus-within:ring-ring",
                large ? "h-12" : "h-10",
                className,
            )}
        >
            <Search className={cn("pointer-events-none ml-3 shrink-0 text-muted-foreground", large ? "size-5" : "size-4")} aria-hidden />
            {children}
        </form>
    );
}
