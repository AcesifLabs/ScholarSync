import { Suspense } from "react";
import { ResearchersView } from "./ResearchersView";

export default function ResearchersPage() {
    return (
        <Suspense>
            <ResearchersView />
        </Suspense>
    );
}
