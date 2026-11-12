import Link from "next/link";
import { ROUTES } from "@/app/lib/constants/routes.constants";
import { cn } from "@/lib/utils";

/** Two offset sheets: a paper and your copy of it, kept in step. */
export function Mark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 20 20" className={cn("size-5 text-primary", className)} aria-hidden>
            <rect x="2.75" y="5.75" width="10.5" height="11.5" rx="1.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <rect x="6.5" y="2.5" width="11" height="12" rx="2" fill="currentColor" />
            <path d="M9.25 6.5h5.5M9.25 9h5.5M9.25 11.5h3.5" stroke="var(--primary-foreground)" strokeWidth="1.25" strokeLinecap="round" />
        </svg>
    );
}

export function Wordmark({ onClick, className }: { onClick?: () => void; className?: string }) {
    return (
        <Link href={ROUTES.home} onClick={onClick} className={cn("flex w-fit items-center gap-2 text-[0.9375rem] font-semibold tracking-tight", className)} aria-label="ScholarSync home">
            <Mark />
            <span aria-hidden>ScholarSync</span>
        </Link>
    );
}
