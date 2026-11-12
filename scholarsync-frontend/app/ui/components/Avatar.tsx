import { initials } from "@/app/lib/utils/text";
import { cn } from "@/lib/utils";

const SIZES = { sm: "size-7 text-[11px]", md: "size-8 text-xs", lg: "size-14 text-lg" } as const;

/** Initials in a circle; decorative, so the name must also appear as text nearby. */
export function Avatar({ name, size = "md", className }: { name: string | null | undefined; size?: keyof typeof SIZES; className?: string }) {
    return (
        <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-secondary font-semibold text-secondary-foreground", SIZES[size], className)} aria-hidden>
            {initials(name)}
        </span>
    );
}
