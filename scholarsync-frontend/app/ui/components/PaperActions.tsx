import { SaveButton } from "@/app/ui/components/SaveButton";
import { AddToCollectionButton } from "@/app/ui/components/AddToCollectionButton";
import { AddToGroupButton } from "@/app/ui/components/AddToGroupButton";

/** Actions shown on any paper: save to library, add to a collection, share with a reading group. */
export function PaperActions({ paperId }: { paperId: string }) {
    return (
        <>
            <SaveButton paperId={paperId} />
            <AddToCollectionButton paperId={paperId} />
            <AddToGroupButton paperId={paperId} />
        </>
    );
}
