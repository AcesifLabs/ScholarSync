import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = { icon: LucideIcon; title: string; description?: React.ReactNode; action?: React.ReactNode; className?: string; compact?: boolean };

export function EmptyState({ icon: Icon, title, description, action, className, compact }: Props) {
    return (
        <div className={cn("enter flex flex-col items-center justify-center gap-3 text-center", compact ? "py-6" : "py-14", className)}>
            <Icon className="size-6 text-muted-foreground" aria-hidden />
            <div className="flex flex-col gap-1">
                <p className="font-medium text-foreground">{title}</p>
                {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
            </div>
            {action}
        </div>
    );
}
