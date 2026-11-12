'use client';

import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useShortcut, useShortcutsEnabled } from "@/app/lib/hooks/useShortcut";
import { openSearch } from "@/app/ui/components/SearchDialog";

const GLOBAL = [
    { keys: ["/"], action: "Focus the search box" },
    { keys: ["?"], action: "Show keyboard shortcuts" },
];

const READER = [
    { keys: ["J"], action: "Next page" },
    { keys: ["K"], action: "Previous page" },
    { keys: ["H"], action: "Highlight the selected text" },
    { keys: ["+", "−"], action: "Zoom in and out" },
    { keys: ["A"], action: "Show or hide annotations" },
    { keys: ["Ctrl", "Enter"], action: "Save an annotation, reply or edit" },
];

const OPEN_EVENT = "scholarsync:shortcuts";

/** Opens the shortcuts dialog from a menu item (works even with single-key shortcuts turned off). */
export const openShortcuts = () => window.dispatchEvent(new Event(OPEN_EVENT));

/** Focuses the first visible paper search field on the page. */
function focusSearch() {
    const field = [...document.querySelectorAll<HTMLInputElement>("[data-search-input]")].find(el => el.offsetParent !== null);
    if (!field) return openSearch();
    field.focus();
    field.select();
}

function Keys({ keys }: { keys: string[] }) {
    return <span className="flex gap-1">{keys.map(k => <kbd key={k} className="min-w-6 rounded border border-input bg-muted px-1.5 text-center font-sans text-xs">{k}</kbd>)}</span>;
}

/** Global "/" and "?" shortcuts plus the shortcuts dialog, where single-key shortcuts can be turned off. */
export function KeyboardShortcuts() {
    const [open, setOpen] = useState(false);
    const [enabled, setEnabled] = useShortcutsEnabled();
    useShortcut("/", focusSearch);
    useShortcut("?", () => setOpen(true));
    useEffect(() => {
        const show = () => setOpen(true);
        window.addEventListener(OPEN_EVENT, show);
        return () => window.removeEventListener(OPEN_EVENT, show);
    }, []);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Keyboard shortcuts</DialogTitle>
                    <DialogDescription>Single-key shortcuts work when you are not typing in a field.</DialogDescription>
                </DialogHeader>
                {[["Everywhere", GLOBAL], ["In the reader", READER]].map(([title, rows]) => (
                    <section key={title as string} className="flex flex-col gap-1">
                        <h3 className="text-xs font-medium text-muted-foreground">{title as string}</h3>
                        <dl className="flex flex-col divide-y text-sm">
                            {(rows as typeof GLOBAL).map(r => (
                                <div key={r.action} className="flex items-center justify-between gap-4 py-1.5">
                                    <dt>{r.action}</dt>
                                    <dd><Keys keys={r.keys} /></dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                ))}
                <label className="flex items-center gap-2 border-t pt-3 text-sm">
                    <Checkbox checked={enabled} onCheckedChange={on => setEnabled(on === true)} />
                    Use single-key shortcuts
                </label>
            </DialogContent>
        </Dialog>
    );
}
