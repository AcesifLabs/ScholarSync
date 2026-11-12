import React from "react";

/** Re-mounts on every navigation, so the reader fades in; no lift, since it fills the window. */
export default function Template({ children }: { children: React.ReactNode }) {
    return <div className="flex min-h-0 flex-1 flex-col animate-in fade-in-0 motion-page">{children}</div>;
}
