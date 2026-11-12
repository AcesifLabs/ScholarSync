export const MAIN_ID = "main";

/** First tab stop on every page; jumps past the navigation. */
export function SkipLink() {
    return (
        <a href={`#${MAIN_ID}`} className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
            Skip to content
        </a>
    );
}
