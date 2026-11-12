'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    confirmLabel: string;
    onConfirm: () => void;
    destructive?: boolean;
    pending?: boolean;
};

/** Replaces window.confirm, which blocks the page and can't be styled. */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, onConfirm, destructive, pending }: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button variant={destructive ? "destructive" : "default"} disabled={pending} onClick={onConfirm}>{confirmLabel}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
