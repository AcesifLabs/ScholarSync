'use client';

import { useLibraryState, useUpdateLibraryItem } from "@/app/api/library";
import { READING_STATUSES } from "@/app/lib/constants/library.constants";
import { toastError } from "@/app/lib/utils/toast";
import { SimpleSelect } from "@/app/ui/components/SimpleSelect";

/** The paper's reading status in the signed-in user's library; nothing when it isn't saved there. */
export function ReadingStatusSelect({ paperId, className }: { paperId: string; className?: string }) {
    const { data: entry } = useLibraryState(paperId);
    const update = useUpdateLibraryItem();
    if (!entry || entry.archived) return null;
    return (
        <SimpleSelect
            size="sm"
            className={className}
            aria-label="Reading status"
            value={entry.status}
            options={READING_STATUSES}
            onValueChange={status => update.mutate({ paperId, status }, { onError: toastError })}
        />
    );
}
