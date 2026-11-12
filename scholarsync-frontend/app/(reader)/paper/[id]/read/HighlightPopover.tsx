'use client';

import React, { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { HIGHLIGHT_COLORS, HighlightColor, PRIVATE_VISIBILITY } from "@/app/lib/constants/annotation.constants";
import { POPOVER_HEIGHT, POPOVER_MARGIN, POPOVER_OFFSET, POPOVER_WIDTH } from "@/app/lib/constants/reader.constants";
import { ANNOTATION_TEXT_MAX } from "@/app/lib/constants/limits.constants";
import type { VisibilityOption } from "@/app/lib/types/annotation.types";
import { SimpleSelect } from "@/app/ui/components/SimpleSelect";

export type HighlightDraft = { color: HighlightColor; comment: string; visibility: string };

type Props = {
    /** Viewport position of the selection's end; re-read on every render so the popover follows the PDF as it scrolls. */
    getAnchor: () => { x: number; y: number } | null;
    /** Re-renders the popover when the PDF scrolls. */
    scrollContainer: HTMLElement | null;
    visibilityOptions: VisibilityOption[];
    /** The visibility used last time; falls back to "Only me" if that group is no longer offered. */
    defaultVisibility: string;
    saving: boolean;
    onCancel: () => void;
    onSave: (draft: HighlightDraft) => void;
};

/** Form for a new highlight. Its state is local so typing doesn't re-render the PDF pages behind it; key it per selection. */
export function HighlightPopover({ getAnchor, scrollContainer, visibilityOptions, defaultVisibility, saving, onCancel, onSave }: Props) {
    const [color, setColor] = useState<HighlightColor>("YELLOW");
    const [comment, setComment] = useState("");
    const offered = defaultVisibility === PRIVATE_VISIBILITY || visibilityOptions.some(o => o.value === defaultVisibility);
    const [visibility, setVisibility] = useState<string>(offered ? defaultVisibility : PRIVATE_VISIBILITY);
    const [, setTick] = useState(0);
    const ref = useRef<HTMLDivElement>(null);
    const commentId = useId();
    const colorRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const latestCancel = useRef(onCancel);
    useEffect(() => { latestCancel.current = onCancel; });

    // Follow the selection while the PDF scrolls
    useEffect(() => {
        if (!scrollContainer) return;
        let frame = 0;
        const onScroll = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => setTick(t => t + 1)); };
        scrollContainer.addEventListener("scroll", onScroll, { passive: true });
        return () => { cancelAnimationFrame(frame); scrollContainer.removeEventListener("scroll", onScroll); };
    }, [scrollContainer]);

    // Esc anywhere and a press outside close it; focus goes back to where it was
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") latestCancel.current(); };
        const onDown = (e: PointerEvent) => {
            // Inside the popover, or inside a select's portal opened from it
            const target = e.target as Element;
            if (ref.current?.contains(target) || target.closest?.("[data-slot=select-content]")) return;
            latestCancel.current();
        };
        document.addEventListener("keydown", onKey);
        document.addEventListener("pointerdown", onDown);
        return () => {
            document.removeEventListener("keydown", onKey);
            document.removeEventListener("pointerdown", onDown);
            if (previous?.isConnected) previous.focus({ preventScroll: true });
        };
    }, []);

    const anchor = getAnchor();
    if (!anchor) return null;
    const index = HIGHLIGHT_COLORS.findIndex(c => c.value === color);
    const onColorKey = (e: React.KeyboardEvent) => {
        const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
        if (!delta) return;
        e.preventDefault();
        const next = (index + delta + HIGHLIGHT_COLORS.length) % HIGHLIGHT_COLORS.length;
        setColor(HIGHLIGHT_COLORS[next].value);
        colorRefs.current[next]?.focus();
    };
    const save = () => onSave({ color, comment, visibility });

    return (
        <div
            ref={ref}
            role="dialog"
            aria-label="New annotation"
            onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !saving) { e.preventDefault(); save(); } }}
            className="fixed z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-lg border bg-popover p-4 text-sm shadow-lg animate-in fade-in-0 zoom-in-95 motion-quick"
            style={{
                left: Math.max(POPOVER_MARGIN, Math.min(anchor.x, window.innerWidth - POPOVER_WIDTH - POPOVER_MARGIN)),
                top: Math.max(POPOVER_MARGIN, Math.min(anchor.y + POPOVER_OFFSET, window.innerHeight - POPOVER_HEIGHT)),
            }}
        >
            <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground" id={`${commentId}-colour`}>Meaning</span>
                <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-labelledby={`${commentId}-colour`} onKeyDown={onColorKey}>
                    {HIGHLIGHT_COLORS.map((c, i) => (
                        <button
                            key={c.value}
                            ref={el => { colorRefs.current[i] = el; }}
                            type="button"
                            role="radio"
                            aria-checked={color === c.value}
                            tabIndex={color === c.value ? 0 : -1}
                            onClick={() => setColor(c.value)}
                            className="flex h-8 items-center gap-2 rounded-md border px-2 text-xs aria-checked:border-foreground aria-checked:font-medium"
                        >
                            <span className="size-3 shrink-0 rounded-sm" style={{ background: c.css }} aria-hidden />
                            {c.label}
                        </button>
                    ))}
                </div>
            </div>
            <label htmlFor={commentId} className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Comment <span className="font-normal">(optional)</span></span>
                <Textarea id={commentId} autoFocus value={comment} maxLength={ANNOTATION_TEXT_MAX} onChange={e => setComment(e.target.value)} rows={3} className="font-serif" />
            </label>
            <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Visible to</span>
                <SimpleSelect aria-label="Visible to" className="flex-1" value={visibility} onValueChange={setVisibility}
                    options={[{ value: PRIVATE_VISIBILITY, label: "Only me" }, ...visibilityOptions]} />
            </div>
            <div className="flex items-center justify-end gap-2">
                <span className="mr-auto text-xs text-muted-foreground"><kbd className="font-sans">Ctrl</kbd>+<kbd className="font-sans">Enter</kbd> saves</span>
                <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
                <Button size="sm" onClick={save} disabled={saving}>Save annotation</Button>
            </div>
        </div>
    );
}
