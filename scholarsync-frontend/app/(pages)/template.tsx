import React from "react";

/** Re-mounts on every navigation, so each new page fades and lifts in; filter and paging changes don't re-mount. */
export default function Template({ children }: { children: React.ReactNode }) {
    // Sized by its content, not main: a full-height wrapper lifted 4px would make main briefly scrollable on short pages
    return <div className="animate-in fade-in-0 slide-in-from-bottom-1 motion-page">{children}</div>;
}
