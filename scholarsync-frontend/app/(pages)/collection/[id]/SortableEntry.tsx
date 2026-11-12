'use client';

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, ChevronDown, GripVertical, NotebookPen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Schemas } from "@/app/api/client";
import { parseTags } from "@/app/lib/utils/array";
import { PaperCard } from "@/app/ui/components/PaperCard";
import { ENTRY_NOTE_MAX } from "@/app/lib/constants/limits.constants";
import { cn } from "@/lib/utils";

// Notes and tags are optional on purpose: the backend may stop sending them in some collection responses
type Entry = Omit<Schemas['CollectionEntry'], "note" | "tags"> & { note?: string | null; tags?: string[] | null };

type Props = {
    entry: Entry;
    position: number;
    count: number;
    saving: boolean;
    onUpdate: (patch: { note?: string; tags?: string[] }) => void;
    onRemove: () => void;
    /** Tags the row for its exit animation. */
    exitKey: string;
    onMove: (delta: -1 | 1) => void;
};

export function SortableEntry({ entry, position, count, saving, onUpdate, onRemove, onMove, exitKey }: Props) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: entry.paper.id });
    const note = entry.note ?? "";
    const tags = entry.tags ?? [];
    const [notesOpen, setNotesOpen] = useState(false);
    const notesId = `notes-${entry.paper.id}`;
    const title = entry.paper.title;

    return (
        <li
            ref={setNodeRef}
            data-exit={exitKey}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={cn("enter flex gap-2 bg-background", isDragging && "relative z-10 shadow-lg")}
        >
            <button
                ref={setActivatorNodeRef}
                {...attributes}
                {...listeners}
                aria-label={`Reorder ${title}`}
                aria-describedby="reorder-help"
                className="mt-4 flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:cursor-grabbing"
            >
                <GripVertical className="size-4" />
            </button>
            <div className="min-w-0 flex-1">
                <PaperCard
                    paper={entry.paper}
                    actions={
                        <>
                            <Button variant="ghost" size="icon-sm" aria-label={`Move ${title} up`} disabled={position === 0} onClick={() => onMove(-1)}><ArrowUp /></Button>
                            <Button variant="ghost" size="icon-sm" aria-label={`Move ${title} down`} disabled={position === count - 1} onClick={() => onMove(1)}><ArrowDown /></Button>
                            <Button variant="ghost" size="sm" aria-expanded={notesOpen} aria-controls={notesId} onClick={() => setNotesOpen(o => !o)}>
                                <NotebookPen /> {note || tags.length ? "Note and tags" : "Add note"}
                                <ChevronDown className={cn("transition-transform", notesOpen && "rotate-180")} />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={onRemove}><Trash2 /> Remove</Button>
                            {saving && <span className="text-xs text-muted-foreground" role="status">Saving…</span>}
                        </>
                    }
                    footer={
                        <>
                            {!notesOpen && note && <p className="reading line-clamp-2 text-[0.9375rem] text-muted-foreground">{note}</p>}
                            {!notesOpen && tags.length > 0 && <p className="text-xs text-muted-foreground">{tags.map(t => `#${t}`).join("  ")}</p>}
                            <div id={notesId} hidden={!notesOpen} className="enter mt-2 grid gap-3 text-sm md:grid-cols-[2fr_1fr]">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-medium text-muted-foreground">Note</span>
                                    <Textarea
                                        key={note}
                                        defaultValue={note}
                                        placeholder="Why this paper matters…"
                                        maxLength={ENTRY_NOTE_MAX}
                                        rows={3}
                                        className="font-serif"
                                        onBlur={e => e.target.value !== note && onUpdate({ note: e.target.value })}
                                    />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-medium text-muted-foreground">Tags (comma separated)</span>
                                    <Input
                                        key={tags.join(",")}
                                        defaultValue={tags.join(", ")}
                                        placeholder="foundational, chapter 2"
                                        onBlur={e => {
                                            const next = parseTags(e.target.value);
                                            if (next.join(",") !== tags.join(",")) onUpdate({ tags: next });
                                        }}
                                    />
                                </label>
                            </div>
                        </>
                    }
                />
            </div>
        </li>
    );
}
