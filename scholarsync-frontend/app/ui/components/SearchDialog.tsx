'use client';

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchBar } from "@/app/ui/components/SearchBar";

const OPEN_EVENT = "scholarsync:search";

/** Opens the search dialog (the "/" shortcut uses it on pages without their own search field). */
export const openSearch = () => window.dispatchEvent(new Event(OPEN_EVENT));

/** A compact top-bar button that opens paper search in a dialog, instead of a search field on every page. */
export function SearchDialog() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const show = () => setOpen(true);
        window.addEventListener(OPEN_EVENT, show);
        return () => window.removeEventListener(OPEN_EVENT, show);
    }, []);
    // Picking a result or submitting navigates; close once the page changes
    const [shownFor, setShownFor] = useState(pathname);
    if (shownFor !== pathname) {
        setShownFor(pathname);
        setOpen(false);
    }

    return (
        <>
            <Button variant="ghost" size="sm" onClick={() => setOpen(true)} aria-keyshortcuts="/" className="text-muted-foreground">
                <Search /> <span className="hidden sm:inline">Search</span>
                <kbd className="ml-1 hidden rounded border border-input px-1.5 font-sans text-xs lg:inline" aria-hidden>/</kbd>
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                {/* Esc or a click outside closes it; a corner close button would sit on top of the Search button */}
                <DialogContent showCloseButton={false} className="top-[15vh] translate-y-0 gap-3 p-3 sm:max-w-2xl">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Search papers</DialogTitle>
                        <DialogDescription>Search by title, topic or author. Use the arrow keys to pick a suggestion.</DialogDescription>
                    </DialogHeader>
                    {open && <SearchBar size="lg" autoFocus />}
                </DialogContent>
            </Dialog>
        </>
    );
}
