'use client';

import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toastError } from "@/app/lib/utils/toast";
import { useAuth } from "@/app/lib/providers/AuthProvider";
import { signIn } from "@/app/api/auth";
import { useLibraryState, useRemovePaper, useSavePaper } from "@/app/api/library";
import { useUndoable } from "@/app/lib/hooks/useUndoable";

export function SaveButton({ paperId }: { paperId: string }) {
    const { user } = useAuth();
    const { data: entry } = useLibraryState(paperId);
    const save = useSavePaper();
    const remove = useRemovePaper();
    const undoable = useUndoable();
    const key = `library:${paperId}`;

    if (!user) {
        return (
            <Button variant="outline" size="sm" onClick={() => signIn()}>
                <Bookmark /> Sign in to save
            </Button>
        );
    }

    const saved = !!entry && !entry.archived && !undoable.pending(key);

    return (
        <Button
            variant={saved ? "secondary" : "outline"}
            size="sm"
            aria-pressed={saved}
            disabled={save.isPending || remove.isPending}
            onClick={() => (saved
                ? undoable.run({ key, message: "Removed from your library", commit: () => remove.mutate(paperId, { onError: toastError }) })
                : undoable.pending(key)
                    // Saving again inside the undo window just cancels the pending removal
                    ? undoable.cancel(key)
                    : save.mutate(paperId, { onSuccess: () => toast.success("Saved to your library"), onError: toastError }))}
            title={saved ? "Remove from library" : "Save to library"}
        >
            {saved ? <><BookmarkCheck /> Saved</> : <><Bookmark /> Save</>}
        </Button>
    );
}
