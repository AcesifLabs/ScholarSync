'use client';

import React, { useId, useState } from "react";
import { friendlyError } from "@/app/lib/utils/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DESCRIPTION_MAX, NAME_MAX } from "@/app/lib/constants/limits.constants";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type Details = { name: string; description: string };

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    submitLabel: string;
    initial?: Details;
    pending?: boolean;
    nameLabel?: string;
    /** Extra fields under the description (e.g. tags). */
    children?: React.ReactNode;
    onSubmit: (details: Details) => void;
    /** The save request's error, shown under the form once it has been submitted. */
    error?: unknown;
};

/** Name + optional description form used to create and rename collections and groups. */
export function DetailsDialog({ open, onOpenChange, title, description, submitLabel, initial, pending, nameLabel = "Name", children, onSubmit, error }: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                {/* Remount the form each time it opens so it starts from `initial` */}
                {open && <DetailsForm {...{ title, description, submitLabel, initial, pending, nameLabel, children, onSubmit, error }} />}
            </DialogContent>
        </Dialog>
    );
}

function DetailsForm({ title, description, submitLabel, initial, pending, nameLabel, children, onSubmit, error }: Omit<Props, "open" | "onOpenChange">) {
    const [name, setName] = useState(initial?.name ?? "");
    const [text, setText] = useState(initial?.description ?? "");
    // Only an error from this form's own submit; the mutation may still hold one from an earlier use
    const [submitted, setSubmitted] = useState(false);
    const errorId = useId();
    const shownError = submitted && !pending && error ? friendlyError(error) : null;

    return (
        <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); if (name.trim()) { setSubmitted(true); onSubmit({ name: name.trim(), description: text.trim() }); } }}>
            <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                {description && <DialogDescription>{description}</DialogDescription>}
            </DialogHeader>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
                {nameLabel}
                <Input autoFocus value={name} onChange={e => setName(e.target.value)} maxLength={NAME_MAX} required aria-invalid={!!shownError || undefined} aria-describedby={shownError ? errorId : undefined} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
                <span>Description <span className="font-normal text-muted-foreground">(optional)</span></span>
                <Textarea value={text} onChange={e => setText(e.target.value)} maxLength={DESCRIPTION_MAX} rows={3} />
            </label>
            {children}
            {shownError && <p id={errorId} role="alert" className="text-sm text-destructive">{shownError.title}. {shownError.message}</p>}
            <DialogFooter>
                <Button type="submit" disabled={!name.trim() || pending}>{submitLabel}</Button>
            </DialogFooter>
        </form>
    );
}
