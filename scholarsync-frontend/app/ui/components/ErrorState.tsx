import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { friendlyError } from "@/app/lib/utils/errors";
import { cn } from "@/lib/utils";

type Props = { error: unknown; onRetry?: () => void; className?: string };

export function ErrorState({ error, onRetry, className }: Props) {
    const { title, message, retryable } = friendlyError(error);
    return (
        <div role="alert" className={cn("enter flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4", className)}>
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
            <div className="flex flex-1 flex-col gap-1">
                <p className="font-semibold text-foreground">{title}</p>
                <p className="text-sm text-muted-foreground">{message}</p>
            </div>
            {retryable && onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry}>
                    <RotateCw /> Retry
                </Button>
            )}
        </div>
    );
}
