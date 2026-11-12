import { Suspense } from "react";
import { LibraryView } from "./LibraryView";

export default function LibraryPage() {
    return (
        <Suspense>
            <LibraryView />
        </Suspense>
    );
}
