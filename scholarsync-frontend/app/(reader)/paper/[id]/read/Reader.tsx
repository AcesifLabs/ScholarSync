'use client';

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import { toast } from "sonner";
import { ArrowLeft, FileUp, Highlighter, Keyboard, Loader2, MessageSquare, Minus, MoreHorizontal, MoveHorizontal, Plus, Trash2, Upload } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/app/ui/components/EmptyState";
import { ErrorState } from "@/app/ui/components/ErrorState";
import { ConfirmDialog } from "@/app/ui/components/ConfirmDialog";
import { ReadingStatusSelect } from "@/app/ui/components/ReadingStatusSelect";
import { openShortcuts } from "@/app/ui/components/KeyboardShortcuts";
import { toastError } from "@/app/lib/utils/toast";
import { ApiError } from "@/app/api/client";
import { usePaper } from "@/app/api/papers";
import { useLibraryState, useSaveLastPage } from "@/app/api/library";
import { pdfUrl, useAnnotations, useCreateAnnotation, useRemovePdf, useUploadPdf } from "@/app/api/annotations";
import { useAuth } from "@/app/lib/providers/AuthProvider";
import { useElementSize } from "@/app/lib/hooks/useElementSize";
import { useLocalSetting } from "@/app/lib/hooks/useLocalSetting";
import { useShortcut } from "@/app/lib/hooks/useShortcut";
import { useDocumentTitle } from "@/app/lib/hooks/useDocumentTitle";
import { colorCss, colorLabel, PRIVATE_VISIBILITY } from "@/app/lib/constants/annotation.constants";
import { ANNOTATION_QUOTE_MAX, PDF_MAX_MB } from "@/app/lib/constants/limits.constants";
import { CURRENT_PAGE_OFFSET, LAST_PAGE_SAVE_DELAY_MS, PAGE_GUTTER, PAGE_MAX_WIDTH, PAGE_MIN_WIDTH, SELECTION_SETTLE_MS } from "@/app/lib/constants/reader.constants";
import { READER_RESIZE_DEBOUNCE_MS } from "@/app/lib/constants/timing.constants";
import { MD_MEDIA_QUERY, SETTING_KEYS } from "@/app/lib/constants/ui.constants";
import { ROUTES } from "@/app/lib/constants/routes.constants";
import type { PositionedAnnotation as Annotation, VisibilityOption } from "@/app/lib/types/annotation.types";
import { groupAnnotationsByPage, isScaledPosition, ScaledPosition, toScaledPosition, toViewport } from "@/app/lib/utils/highlight";
import { clampPage, initialPage, shouldMarkInProgress, stepZoom } from "@/app/lib/utils/reader";
import { AnnotationFilter, AnnotationPanel } from "./AnnotationPanel";
import { HighlightDraft, HighlightPopover } from "./HighlightPopover";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

/** A text selection that can become a highlight; `id` changes per selection so the popover's form starts fresh. */
type Selection = { id: number; position: ScaledPosition; quote: string };

// Must be a stable object: react-pdf reloads the document when `options` changes identity.
// Range requests are off because the backend proxy streams the whole file.
const PDF_OPTIONS = { disableRange: true };
/** Pages rendered on each side of the current one; the rest are size-matched placeholders. */
const RENDER_WINDOW = 2;
/** A4/Letter-ish height:width until the first page reports its real size. */
const FALLBACK_ASPECT = 1.294;
const NO_ANNOTATIONS: Annotation[] = [];
const NO_OPTIONS: VisibilityOption[] = [];
const NO_FILTER: AnnotationFilter = { author: "", visibility: "" };

function uploadError(error: unknown) {
    // The backend only accepts PDFs for papers the uploader has saved or shares through a group
    if (error instanceof ApiError && error.status === 403) {
        toast.error("Save the paper to your library first", { description: "You can upload a PDF for papers in your library or in one of your reading groups." });
    } else {
        toastError(error);
    }
}

/** Viewport point under the end of a highlight position, or null when its page isn't on screen. */
function anchorFor(container: HTMLElement | null, position: ScaledPosition) {
    const pageEl = container?.querySelector<HTMLElement>(`[data-page-number="${position.pageNumber}"]`);
    if (!pageEl) return null;
    const page = pageEl.getBoundingClientRect();
    const box = toViewport(position.boundingRect, page.width, page.height);
    return { x: page.left + box.left, y: page.top + box.top + box.height };
}

/** The "Highlight" button that appears at the end of a text selection; follows the PDF as it scrolls. */
function SelectionAction({ container, selection, onHighlight }: { container: HTMLElement | null; selection: Selection; onHighlight: () => void }) {
    const [, setTick] = useState(0);
    useEffect(() => {
        if (!container) return;
        let frame = 0;
        const onScroll = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => setTick(t => t + 1)); };
        container.addEventListener("scroll", onScroll, { passive: true });
        return () => { cancelAnimationFrame(frame); container.removeEventListener("scroll", onScroll); };
    }, [container]);
    const anchor = anchorFor(container, selection.position);
    if (!anchor) return null;
    return (
        <Button
            size="sm"
            className="fixed z-40 shadow-md"
            style={{ left: Math.min(anchor.x, window.innerWidth - 140), top: Math.min(anchor.y + 6, window.innerHeight - 44) }}
            // Keep the text selection: a mousedown on the button would otherwise clear it
            onMouseDown={e => e.preventDefault()}
            onClick={onHighlight}
        >
            <Highlighter /> Highlight <kbd className="ml-1 rounded bg-primary-foreground/20 px-1 font-sans text-[11px]">H</kbd>
        </Button>
    );
}

type PdfPageProps = {
    pageNumber: number;
    width: number;
    height: number;
    /** Inside the render window: draw the page and its highlights. Outside it is an empty, size-matched placeholder. */
    near: boolean;
    annotations: Annotation[];
    selectedId: string | null;
    onAnnotationClick: (id: string) => void;
    onAspect: (pageNumber: number, aspect: number) => void;
};

/** Memoised so a page change only re-renders the pages entering or leaving the render window. */
const PdfPage = memo(function PdfPage({ pageNumber, width, height, near, annotations, selectedId, onAnnotationClick, onAspect }: PdfPageProps) {
    return (
        // bg-white on purpose: PDF pages are paper-white in any theme
        <div data-page-number={pageNumber} className="relative mx-auto mb-4 bg-white shadow-sm ring-1 ring-black/10" style={{ width, minHeight: height }}>
            {near && (
                <Page
                    pageNumber={pageNumber}
                    width={width}
                    renderAnnotationLayer={false}
                    loading={<Skeleton className="absolute inset-0 rounded-none bg-black/5" />}
                    onLoadSuccess={p => onAspect(pageNumber, p.originalHeight / p.originalWidth)}
                />
            )}
            {near && annotations.flatMap(a => a.position.rects.map((rect, i) => (
                <button
                    key={`${a.id}-${i}`}
                    type="button"
                    // Only the first rect of a highlight is a tab stop; the rest are the same annotation
                    tabIndex={i === 0 ? 0 : -1}
                    aria-hidden={i === 0 ? undefined : true}
                    aria-label={`${colorLabel(a.color)} by ${a.author.name}: “${a.quote.slice(0, 80)}”`}
                    aria-pressed={selectedId === a.id}
                    onClick={() => onAnnotationClick(a.id)}
                    className="absolute cursor-pointer mix-blend-multiply focus-visible:outline-offset-0"
                    style={{
                        ...toViewport(rect, width, height),
                        background: colorCss(a.color),
                        outline: selectedId === a.id ? "2px solid var(--ring)" : undefined,
                    }}
                />
            )))}
        </div>
    );
});

export function Reader({ paperId, visibilityOptions = NO_OPTIONS }: { paperId: string; visibilityOptions?: VisibilityOption[] }) {
    const params = useSearchParams();
    const { user } = useAuth();
    const paper = usePaper(paperId);
    useDocumentTitle(paper.data?.title);
    const annotations = useAnnotations(paperId);
    const create = useCreateAnnotation(paperId);
    const upload = useUploadPdf(paperId);
    const removePdf = useRemovePdf(paperId);
    const libraryState = useLibraryState(paperId);
    const libraryEntry = libraryState.data;
    const saveLastPage = useSaveLastPage(paperId);
    const [numPages, setNumPages] = useState(0);
    const [aspect, setAspect] = useState<Record<number, number>>({});
    const [draft, setDraft] = useState<Selection | null>(null);
    const [pending, setPending] = useState<Selection | null>(null);
    const selectionCount = useRef(0);
    const [panelOpen, setPanelOpen] = useLocalSetting<boolean>(SETTING_KEYS.annotationsPanelOpen, true);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [focusToken, setFocusToken] = useState(0);
    const [filter, setFilter] = useState<AnnotationFilter>(NO_FILTER);
    const [zoom, setZoom] = useLocalSetting<number>(SETTING_KEYS.readerZoom, 1);
    const [defaultVisibility, setDefaultVisibility] = useLocalSetting<string>(SETTING_KEYS.annotationVisibility(user?.id ?? "anonymous"), PRIVATE_VISIBILITY);
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [announcement, setAnnouncement] = useState("");
    const [scrollRef, size, scrollEl] = useElementSize<HTMLDivElement>(READER_RESIZE_DEBOUNCE_MS);
    const fitWidth = Math.max(PAGE_MIN_WIDTH, Math.min(size.width - PAGE_GUTTER, PAGE_MAX_WIDTH));
    const pageWidth = Math.round(Math.max(PAGE_MIN_WIDTH * 0.66, fitWidth * zoom));
    const allAnnotations = annotations.data ?? NO_ANNOTATIONS;
    const refetchAnnotations = annotations.refetch;

    const visible = useMemo<Annotation[]>(() => allAnnotations
        .filter((a): a is Annotation => isScaledPosition(a.position))
        .filter(a => !filter.author || a.author.id === filter.author)
        .filter(a => !filter.visibility || (filter.visibility === PRIVATE_VISIBILITY ? a.visibility === PRIVATE_VISIBILITY : a.groupId === filter.visibility)),
    [allAnnotations, filter]);

    const byPage = useMemo(() => groupAnnotationsByPage(visible), [visible]);
    const [currentPage, setCurrentPage] = useState(1);
    const currentPageRef = useRef(1);
    const [pageInput, setPageInput] = useState("1");
    const pagesShown = size.width > 0 && numPages > 0;

    // The current page is the first one with more than CURRENT_PAGE_OFFSET px below the container's top edge
    useEffect(() => {
        const container = scrollRef.current;
        if (!container || !pagesShown) return;
        const intersecting = new Set<number>();
        const observer = new IntersectionObserver(entries => {
            for (const entry of entries) {
                const page = Number((entry.target as HTMLElement).dataset.pageNumber);
                if (entry.isIntersecting) intersecting.add(page);
                else intersecting.delete(page);
            }
            if (intersecting.size === 0) return;
            const first = Math.min(...intersecting);
            currentPageRef.current = first;
            setCurrentPage(first);
            setPageInput(String(first));
        }, { root: container, rootMargin: `-${CURRENT_PAGE_OFFSET}px 0px 0px 0px` });
        container.querySelectorAll("[data-page-number]").forEach(page => observer.observe(page));
        return () => observer.disconnect();
    }, [scrollRef, pagesShown, numPages]);

    const baseAspect = aspect[1] ?? Object.values(aspect)[0] ?? FALLBACK_ASPECT;
    const file = useMemo(() => ({ url: pdfUrl(paperId), withCredentials: true }), [paperId]);

    const scrollToPage = useCallback((page: number, smooth = true) => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        scrollRef.current?.querySelector(`[data-page-number="${page}"]`)?.scrollIntoView({ behavior: smooth && !reduce ? "smooth" : "auto", block: "start" });
    }, [scrollRef]);

    const jumpTo = useCallback((page: number) => {
        const target = clampPage(page, numPages);
        if (!target) return;
        scrollToPage(target);
        setAnnouncement(`Page ${target} of ${numPages}`);
    }, [numPages, scrollToPage]);

    // Open where the reader should: a linked annotation, ?page=, or the page saved last time
    const opened = useRef(false);
    const annotationParam = params.get("annotation");
    const linked = annotationParam ? allAnnotations.find(a => a.id === annotationParam) : undefined;
    const waitingForLinked = !!annotationParam && annotations.isPending;
    // Without this the reader opens at page 1 on a cold load, then saves page 1 over the real last page
    const waitingForSaved = libraryState.isPending && libraryState.fetchStatus !== "idle";
    useEffect(() => {
        if (opened.current || !pagesShown || waitingForLinked || waitingForSaved) return;
        opened.current = true;
        const lastPage = libraryEntry?.lastPage;
        const linkedPage = linked && isScaledPosition(linked.position) ? linked.position.pageNumber : null;
        const page = initialPage({ annotationPage: linkedPage, pageParam: params.get("page"), lastPage, numPages });
        // Wait a frame so the placeholders have their heights
        requestAnimationFrame(() => {
            if (page > 1) scrollToPage(page, false);
            if (linked) {
                setSelectedId(linked.id);
                setFocusToken(t => t + 1);
                setPanelOpen(true);
            }
        });
    }, [pagesShown, waitingForLinked, waitingForSaved, linked, numPages, params, libraryEntry, scrollToPage, setPanelOpen]);

    // Remember the page for "Continue reading", once the reader has settled on it
    const lastSaved = useRef<number | null>(null);
    useEffect(() => {
        if (!opened.current || !libraryEntry || libraryEntry.archived || lastSaved.current === currentPage) return;
        const timer = setTimeout(() => {
            lastSaved.current = currentPage;
            saveLastPage.mutate({ lastPage: currentPage, status: shouldMarkInProgress(libraryEntry.status, currentPage) ? "IN_PROGRESS" : undefined });
        }, LAST_PAGE_SAVE_DELAY_MS);
        return () => clearTimeout(timer);
    }, [currentPage, libraryEntry, saveLastPage]);

    // A settled text selection inside the PDF offers "Highlight"; works for mouse, keyboard and touch selections
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        const read = () => {
            const selection = window.getSelection();
            const container = scrollRef.current;
            if (!selection || selection.isCollapsed || selection.rangeCount === 0 || !container) { setDraft(null); return; }
            const range = selection.getRangeAt(0);
            const pageEl = range.startContainer.parentElement?.closest<HTMLElement>("[data-page-number]");
            if (!pageEl || !container.contains(pageEl)) { setDraft(null); return; }
            const position = toScaledPosition([...range.getClientRects()], pageEl.getBoundingClientRect(), Number(pageEl.dataset.pageNumber));
            if (!position) { setDraft(null); return; }
            selectionCount.current += 1;
            setDraft({ id: selectionCount.current, position, quote: selection.toString().trim().slice(0, ANNOTATION_QUOTE_MAX) });
        };
        const onChange = () => { clearTimeout(timer); timer = setTimeout(read, SELECTION_SETTLE_MS); };
        document.addEventListener("selectionchange", onChange);
        return () => { clearTimeout(timer); document.removeEventListener("selectionchange", onChange); };
    }, [scrollRef]);

    const startHighlight = useCallback(() => { if (draft) setPending(draft); }, [draft]);

    const save = ({ color, comment, visibility }: HighlightDraft) => {
        if (!pending) return;
        create.mutate({
            visibility: visibility === PRIVATE_VISIBILITY ? PRIVATE_VISIBILITY : "GROUP",
            groupId: visibility === PRIVATE_VISIBILITY ? undefined : visibility,
            color,
            position: pending.position,
            quote: pending.quote,
            comment: comment.trim() || undefined,
        }, {
            onError: toastError,
            onSuccess: created => {
                setDefaultVisibility(visibility);
                setPending(null);
                setDraft(null);
                setSelectedId(created.id);
                window.getSelection()?.removeAllRanges();
            },
        });
    };

    const isDesktop = () => window.matchMedia(MD_MEDIA_QUERY).matches;
    const toggleAnnotations = useCallback(() => {
        if (isDesktop()) setPanelOpen(!panelOpen);
        else setSheetOpen(o => !o);
    }, [panelOpen, setPanelOpen]);

    useShortcut("j", () => jumpTo(currentPageRef.current + 1), numPages > 0);
    useShortcut("k", () => jumpTo(currentPageRef.current - 1), numPages > 0);
    useShortcut("h", startHighlight, !!draft && !pending);
    useShortcut("a", toggleAnnotations);
    useShortcut("+", () => setZoom(stepZoom(zoom, 1)));
    useShortcut("=", () => setZoom(stepZoom(zoom, 1)));
    useShortcut("-", () => setZoom(stepZoom(zoom, -1)));

    const onAspect = useCallback((pageNumber: number, value: number) => {
        setAspect(prev => (prev[pageNumber] ? prev : { ...prev, [pageNumber]: value }));
    }, []);

    const onAnnotationClick = useCallback((id: string) => {
        setSelectedId(id);
        setFocusToken(t => t + 1);
        // On phones the panel is a sheet, so open it to show the thread
        if (!window.matchMedia(MD_MEDIA_QUERY).matches) setSheetOpen(true);
        else setPanelOpen(true);
    }, [setPanelOpen]);

    const onSelectAnnotation = useCallback((a: Annotation) => {
        setSelectedId(a.id);
        setSheetOpen(false);
        scrollToPage(a.position.pageNumber);
    }, [scrollToPage]);

    const retryAnnotations = useCallback(() => { void refetchAnnotations(); }, [refetchAnnotations]);
    const hasPdf = !!paper.data?.hasPdf;

    const header = (
        <header className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b bg-surface px-3 py-2">
            <Link href={ROUTES.paper(paperId)} aria-label="Back to the paper" className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
                <ArrowLeft />
            </Link>
            <h1 className="min-w-0 flex-1 truncate text-sm font-semibold">{paper.data?.title ?? "Loading…"}</h1>
            {numPages > 0 && (
                <form className="flex items-center gap-1.5 text-sm" onSubmit={e => { e.preventDefault(); jumpTo(Number(pageInput)); }}>
                    <Input
                        aria-label={`Page, of ${numPages}`}
                        inputMode="numeric"
                        value={pageInput}
                        onChange={e => setPageInput(e.target.value)}
                        onBlur={() => setPageInput(String(currentPage))}
                        className="h-7 w-12 text-center tabular-nums md:text-sm"
                    />
                    <span className="text-muted-foreground" aria-hidden>/ {numPages}</span>
                </form>
            )}
            {hasPdf && (
                <div className="hidden items-center gap-0.5 md:flex" role="group" aria-label="Zoom">
                    <Button variant="ghost" size="icon-sm" aria-label="Zoom out" disabled={zoom <= 0.5} onClick={() => setZoom(stepZoom(zoom, -1))}><Minus /></Button>
                    <span className="w-11 text-center text-xs tabular-nums text-muted-foreground" aria-live="polite">{Math.round(zoom * 100)}%</span>
                    <Button variant="ghost" size="icon-sm" aria-label="Zoom in" disabled={zoom >= 3} onClick={() => setZoom(stepZoom(zoom, 1))}><Plus /></Button>
                    <Button variant="ghost" size="icon-sm" aria-label="Fit to width" aria-pressed={zoom === 1} onClick={() => setZoom(1)}><MoveHorizontal /></Button>
                </div>
            )}
            <ReadingStatusSelect paperId={paperId} />
            {hasPdf && (
                <Button variant={panelOpen ? "secondary" : "outline"} size="sm" aria-pressed={panelOpen} onClick={toggleAnnotations}>
                    <MessageSquare /> Annotations <span className="tabular-nums text-muted-foreground">{visible.length}</span>
                </Button>
            )}
            <DropdownMenu>
                <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon-sm" })} aria-label="More reader actions"><MoreHorizontal /></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={openShortcuts}><Keyboard /> Keyboard shortcuts</DropdownMenuItem>
                    {paper.data?.pdfUploadedByYou && (
                        <DropdownMenuItem variant="destructive" onClick={() => setConfirmRemove(true)}><Trash2 /> Remove my upload</DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
            <p className="sr-only" aria-live="polite">{announcement}</p>
            <ConfirmDialog
                open={confirmRemove}
                onOpenChange={setConfirmRemove}
                title="Remove the PDF you uploaded?"
                description="Everyone loses access to this PDF until someone uploads it again. You can only remove it while nobody has annotated it."
                confirmLabel="Remove PDF"
                destructive
                pending={removePdf.isPending}
                onConfirm={() => removePdf.mutate(undefined, {
                    onSuccess: () => { setConfirmRemove(false); toast.success("Your upload was removed"); },
                    onError: error => {
                        setConfirmRemove(false);
                        if (error instanceof ApiError && error.status === 409) toast.error("This PDF has annotations", { description: "An upload can only be removed before anyone annotates it." });
                        else toastError(error);
                    },
                })}
            />
        </header>
    );

    if (paper.isPending || paper.error || !paper.data) {
        return (
            <div className="flex h-full flex-col">
                {header}
                <div className="flex-1 bg-muted p-6">
                    {paper.isPending
                        ? <div className="mx-auto flex max-w-3xl flex-col gap-4" role="status" aria-label="Loading paper"><Skeleton className="h-[70vh] w-full bg-background" /></div>
                        : <ErrorState error={paper.error} onRetry={() => paper.refetch()} className="mx-auto max-w-md bg-card" />}
                </div>
            </div>
        );
    }

    if (!paper.data.hasPdf) {
        return (
            <div className="flex h-full flex-col">
                {header}
                <div className="mx-auto flex w-full max-w-xl flex-col gap-4 p-6 md:p-10">
                    <EmptyState
                        icon={FileUp}
                        title="No open-access PDF for this paper"
                        description={`If you have a copy, upload it to read and annotate it here. It becomes this paper's PDF for everyone (PDF only, up to ${PDF_MAX_MB} MB).`}
                        action={
                            <label className={buttonVariants({ className: "cursor-pointer has-focus-visible:ring-2 has-focus-visible:ring-ring" })}>
                                {upload.isPending ? <><Loader2 className="animate-spin" /> Uploading…</> : <><Upload /> Choose a PDF</>}
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    className="sr-only"
                                    disabled={upload.isPending}
                                    onChange={e => {
                                        const chosen = e.target.files?.[0];
                                        // Cleared so picking the same file again (e.g. after a failed upload) still fires onChange
                                        e.target.value = "";
                                        if (chosen) upload.mutate(chosen, { onSuccess: () => toast.success("PDF uploaded"), onError: uploadError });
                                    }}
                                />
                            </label>
                        }
                    />
                </div>
            </div>
        );
    }

    const panel = (
        <AnnotationPanel
            paperId={paperId}
            annotations={visible}
            allAnnotations={allAnnotations}
            selectedId={selectedId}
            focusToken={focusToken}
            onSelect={onSelectAnnotation}
            filter={filter}
            onFilter={setFilter}
            error={annotations.error}
            onRetry={retryAnnotations}
        />
    );

    return (
        <div className="flex h-full flex-col">
            {header}
            <div className="relative flex min-h-0 flex-1">
                <div ref={scrollRef} className="flex-1 overflow-auto bg-muted p-4" aria-label="PDF pages">
                    <Document
                        file={file}
                        options={PDF_OPTIONS}
                        // react-pdf 11 suspends by default; with no boundary here, every page entering the render
                        // window swapped the whole reader for the route fallback and reset the scroll to the top.
                        // Non-suspense mode loads each page in place and uses the loading/error props below.
                        suspense={false}
                        onLoadSuccess={doc => setNumPages(doc.numPages)}
                        loading={<div className="mx-auto flex max-w-3xl flex-col gap-4" role="status" aria-label="Loading PDF"><Skeleton className="h-[70vh] w-full bg-background" /></div>}
                        error={<div className="mx-auto max-w-md p-6"><ErrorState error={new Error("The PDF couldn't be loaded. The publisher may block downloads or be rate-limiting us; try again later.")} className="bg-card" /></div>}
                    >
                        {size.width > 0 && Array.from({ length: numPages }, (_, i) => i + 1).map(pageNumber => {
                            const near = Math.abs(pageNumber - currentPage) <= RENDER_WINDOW;
                            return (
                                <PdfPage
                                    key={pageNumber}
                                    pageNumber={pageNumber}
                                    width={pageWidth}
                                    height={pageWidth * (aspect[pageNumber] ?? baseAspect)}
                                    near={near}
                                    annotations={near ? byPage.get(pageNumber) ?? NO_ANNOTATIONS : NO_ANNOTATIONS}
                                    selectedId={near ? selectedId : null}
                                    onAnnotationClick={onAnnotationClick}
                                    onAspect={onAspect}
                                />
                            );
                        })}
                    </Document>
                </div>

                {/* Below 1100px the panel overlays the PDF instead of squeezing it */}
                {panelOpen && (
                    <aside className="absolute inset-y-0 right-0 z-20 hidden w-96 max-w-[85%] shrink-0 overflow-y-auto border-l bg-surface shadow-xl md:block min-[1100px]:static min-[1100px]:shadow-none animate-in fade-in-0 slide-in-from-right-2 motion-page" aria-label="Annotations">
                        {panel}
                    </aside>
                )}
            </div>

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side="right" className="w-full overflow-y-auto bg-surface sm:max-w-md">
                    {/* Panel has its own visible heading; keep the dialog title for screen readers */}
                    <SheetHeader className="sr-only"><SheetTitle>Annotations</SheetTitle></SheetHeader>
                    {panel}
                </SheetContent>
            </Sheet>

            {draft && !pending && <SelectionAction key={draft.id} container={scrollEl} selection={draft} onHighlight={startHighlight} />}
            {pending && (
                <HighlightPopover
                    key={pending.id}
                    getAnchor={() => anchorFor(scrollEl, pending.position)}
                    scrollContainer={scrollEl}
                    visibilityOptions={visibilityOptions}
                    defaultVisibility={defaultVisibility}
                    saving={create.isPending}
                    onCancel={() => setPending(null)}
                    onSave={save}
                />
            )}
        </div>
    );
}
