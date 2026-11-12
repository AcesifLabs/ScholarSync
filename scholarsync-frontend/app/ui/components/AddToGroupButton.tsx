'use client';

import { Users } from "lucide-react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { toastError } from "@/app/lib/utils/toast";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Schemas } from "@/app/api/client";
import { useAddGroupPaper, useMyGroups } from "@/app/api/groups";
import { atLeast } from "@/app/lib/utils/groups";

const writableGroups = (groups: Schemas['GroupSummary'][]) => groups.filter(g => atLeast(g.myRole, "MEMBER"));

function GroupItems({ paperId, groups }: { paperId: string; groups: Schemas['GroupSummary'][] }) {
    const add = useAddGroupPaper();
    return groups.map(g => (
        <DropdownMenuItem key={g.id} onClick={() => add.mutate({ groupId: g.id, paperId }, { onSuccess: () => toast.success(`Shared with “${g.name}”`), onError: toastError })}>{g.name}</DropdownMenuItem>
    ));
}

/** Only listed for groups where the user may add papers (member or above). */
export function AddToGroupButton({ paperId }: { paperId: string }) {
    // select: the card re-renders only when the writable groups change, not on every refetch of the list
    const { data: writable = [] } = useMyGroups(writableGroups);
    if (writable.length === 0) return null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className={buttonVariants({ variant: "outline", size: "sm" })} aria-label="Share with a reading group">
                <Users /> Group
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                    <DropdownMenuLabel>Share with group</DropdownMenuLabel>
                    <GroupItems paperId={paperId} groups={writable} />
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
