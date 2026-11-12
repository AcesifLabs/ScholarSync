import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthGate } from "@/app/ui/components/AuthGate";
import { KeyboardShortcuts } from "@/app/ui/components/KeyboardShortcuts";
import { MAIN_ID, SkipLink } from "@/app/ui/components/SkipLink";

export const metadata: Metadata = { title: "Reader" };

/** Focus mode: the reader gets the whole window, without the app's navigation bar and sidebar. */
export default function ReaderLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex h-dvh flex-col">
            <SkipLink />
            <main id={MAIN_ID} tabIndex={-1} className="flex min-h-0 flex-1 flex-col focus-visible:outline-none">
                <AuthGate>{children}</AuthGate>
            </main>
            <KeyboardShortcuts />
        </div>
    );
}
