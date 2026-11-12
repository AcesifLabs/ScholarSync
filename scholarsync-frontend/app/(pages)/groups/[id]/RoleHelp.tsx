'use client';

import { CircleHelp } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import { ROLE_DESCRIPTIONS } from "@/app/lib/constants/group.constants";

/** "What can each role do?" in a small dialog. */
export function RoleHelp({ label = "What can each role do?" }: { label?: string }) {
    return (
        <Dialog>
            <DialogTrigger className={buttonVariants({ variant: "link", size: "xs", className: "h-auto px-0 align-baseline text-muted-foreground hover:text-foreground" })}>
                <CircleHelp aria-hidden /> {label}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Roles in a reading group</DialogTitle>
                    <DialogDescription>Each member has one role. Higher roles can do everything the roles below them can.</DialogDescription>
                </DialogHeader>
                <dl className="flex flex-col divide-y text-sm">
                    {ROLE_DESCRIPTIONS.map(r => (
                        <div key={r.role} className="grid gap-1 py-2.5 sm:grid-cols-[6rem_1fr]">
                            <dt className="font-medium">{r.label}</dt>
                            <dd className="text-muted-foreground">{r.can}</dd>
                        </div>
                    ))}
                </dl>
            </DialogContent>
        </Dialog>
    );
}
