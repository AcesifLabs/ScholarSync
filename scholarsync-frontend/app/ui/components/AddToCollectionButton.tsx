'use client';

import Link from "next/link";
import { FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { toastError } from "@/app/lib/utils/toast";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/app/lib/providers/AuthProvider";
import { useAddToCollection, useCollections } from "@/app/api/collections";
import { ROUTES } from "@/app/lib/constants/routes.constants";

/** Mounted only while the menu is open, so a list of paper cards doesn't hold a collections query per card. */
function CollectionItems({ paperId }: { paperId: string }) {
    const { data: collections } = useCollections();
    const add = useAddToCollection();
    return (
        <>
            {collections?.length === 0 && <DropdownMenuItem disabled>No collections yet</DropdownMenuItem>}
            {collections?.map(c => (
                <DropdownMenuItem key={c.id} onClick={() => add.mutate({ id: c.id, paperId }, { onSuccess: () => toast.success(`Added to “${c.name}”`), onError: toastError })}>{c.name}</DropdownMenuItem>
            ))}
        </>
    );
}

export function AddToCollectionButton({ paperId }: { paperId: string }) {
    const { user } = useAuth();
    if (!user) return null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className={buttonVariants({ variant: "outline", size: "sm" })} aria-label="Add to collection">
                <FolderPlus /> Collection
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                    <DropdownMenuLabel>Add to collection</DropdownMenuLabel>
                    <CollectionItems paperId={paperId} />
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href={ROUTES.collections} />}>New collection…</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
