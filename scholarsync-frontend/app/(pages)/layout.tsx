import React from "react";
import { Navbar } from "@/app/ui/components/Navbar";
import { Sidebar } from "@/app/ui/components/Sidebar";
import { AuthGate } from "@/app/ui/components/AuthGate";
import { KeyboardShortcuts } from "@/app/ui/components/KeyboardShortcuts";
import { SkipLink, MAIN_ID } from "@/app/ui/components/SkipLink";

export default function UniversalLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-dvh flex-col">
            <SkipLink />
            <Navbar />
            <div className="flex min-h-0 flex-1">
                <Sidebar />
                <main id={MAIN_ID} tabIndex={-1} className="min-w-0 flex-1 overflow-auto focus-visible:outline-none">
                    <AuthGate>{children}</AuthGate>
                </main>
            </div>
            <KeyboardShortcuts />
        </div>
    );
}
