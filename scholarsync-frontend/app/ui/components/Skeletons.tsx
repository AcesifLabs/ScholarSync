import { Skeleton } from "@/components/ui/skeleton";

export function PaperCardSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="flex flex-col divide-y border-y" aria-hidden>
            {Array.from({ length: count }, (_, i) => (
                <div key={i} className="flex flex-col gap-2 py-4">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-9 w-full" />
                </div>
            ))}
        </div>
    );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
    return (
        <div className="flex flex-col gap-2" aria-hidden>
            {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
    );
}
