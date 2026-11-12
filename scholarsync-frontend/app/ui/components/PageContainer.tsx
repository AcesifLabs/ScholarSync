import React from "react";
import { cn } from "@/lib/utils";

/** Centred, width-capped content column shared by every page. */
export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cn("mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8", className)}>{children}</div>;
}
