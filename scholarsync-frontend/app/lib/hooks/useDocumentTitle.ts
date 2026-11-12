'use client';

import { useEffect } from 'react';

const APP_NAME = 'ScholarSync';

/** Sets the tab title for pages whose title comes from loaded data; the segment's metadata title shows until then. */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} · ${APP_NAME}`;
    return () => { document.title = previous; };
  }, [title]);
}
