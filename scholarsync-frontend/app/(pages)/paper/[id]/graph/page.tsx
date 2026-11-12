'use client';

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ForceGraphMethods } from "react-force-graph-2d";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Download, GitFork, Loader2, Maximize, Minus, Plus, RotateCw, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/app/ui/components/PageHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { friendlyError } from "@/app/lib/utils/errors";
import { ErrorState } from "@/app/ui/components/ErrorState";
import { EmptyState } from "@/app/ui/components/EmptyState";
import { Segmented } from "@/app/ui/components/Segmented";
import { useCitationGraph, useFetchExpansion } from "@/app/api/graph";
import {
    GRAPH_CHARGE_STRENGTH, GRAPH_COLOR_BY_OPTIONS, GRAPH_COOLDOWN_TICKS, GRAPH_DEPTH_OPTIONS, GRAPH_DIRECTION_OPTIONS, GRAPH_LINK_DISTANCE,
    GRAPH_NODE_REL_SIZE, GRAPH_ZOOM_TO_FIT_MS, GRAPH_ZOOM_TO_FIT_PADDING, GraphColorBy, GraphDepth, GraphDirectionParam,
} from "@/app/lib/constants/graph.constants";
import { useElementSize } from "@/app/lib/hooks/useElementSize";
import { GRAPH_RESIZE_DEBOUNCE_MS } from "@/app/lib/constants/timing.constants";
import { colorScale, domain, endpointId, escapeHtml, GraphData, GraphNodeData, mergeGraph, SCALE_TOKENS } from "@/app/lib/utils/graph";
import { formatAuthors } from "@/app/lib/utils/text";
import { PaperActions } from "@/app/ui/components/PaperActions";
import { ROUTES } from "@/app/lib/constants/routes.constants";

// force-graph touches window/canvas at import time
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

/** Canvas can't resolve CSS variables, so read the theme tokens' computed values once on the client. */
function canvasColors() {
    if (typeof document === "undefined") return { root: "", link: "", missing: "", scale: [] as string[] };
    const css = getComputedStyle(document.documentElement);
    const token = (name: string) => css.getPropertyValue(name).trim();
    return {
        root: token("--foreground"), link: token("--graph-link"), missing: token("--graph-missing"),
        scale: SCALE_TOKENS.map(t => token(t.slice(4, -1))),
    };
}

export default function GraphPage() {
    const { id } = useParams<{ id: string }>();
    const paperId = decodeURIComponent(id);
    const [direction, setDirection] = useState<GraphDirectionParam>("both");
    const [depth, setDepth] = useState<GraphDepth>(1);
    const [colorBy, setColorBy] = useState<GraphColorBy>("year");
    const [selected, setSelected] = useState<GraphNodeData | null>(null);
    // Expansions are layered on top of the fetched graph; they reset when the query changes.
    const [expansions, setExpansions] = useState<{ key: string; graph: GraphData }>({ key: "", graph: { nodes: [], links: [] } });
    const [expandError, setExpandError] = useState<string>();
    const [expanding, setExpanding] = useState<GraphNodeData | null>(null);
    const [view, setView] = useState<"graph" | "list">("graph");
    const selectedRef = useRef<HTMLDivElement>(null);
    const select = (node: GraphNodeData | null) => {
        setSelected(node);
        // Move focus to the card so keyboard and screen-reader users land on what they picked
        if (node) requestAnimationFrame(() => selectedRef.current?.focus());
    };
    const [containerRef, size] = useElementSize<HTMLDivElement>(GRAPH_RESIZE_DEBOUNCE_MS);
    const fittedFor = useRef("");
    // The graph mounts after its dynamic import, so forces are configured when React assigns the ref
    // (a setter on `current`).
    const graphRef = useMemo(() => {
        let current: ForceGraphMethods | undefined;
        return {
            get current() { return current; },
            set current(fg: ForceGraphMethods | undefined) {
                current = fg;
                fg?.d3Force("link")?.distance(GRAPH_LINK_DISTANCE);
                fg?.d3Force("charge")?.strength(GRAPH_CHARGE_STRENGTH);
            },
        };
    }, []);
    const { data, error, isFetching, isPending, refetch } = useCitationGraph(paperId, direction, depth);
    const fetchExpansion = useFetchExpansion();

    const queryKey = `${direction}-${depth}`;
    const graph = useMemo<GraphData>(() => {
        const base: GraphData = data ? { nodes: data.nodes, links: data.links } : { nodes: [], links: [] };
        return expansions.key === queryKey ? mergeGraph(base, expansions.graph) : base;
    }, [data, expansions, queryKey]);

    // Only recomputed when the graph or colouring changes, not on selection or expansion-loading renders
    const range = useMemo(() => domain(graph.nodes.map(n => (colorBy === "year" ? n.year : n.citationCount))), [graph, colorBy]);
    const [lo, hi] = range;
    // Re-read when the theme class changes so the canvas follows light/dark
    const [themeKey, setThemeKey] = useState(0);
    useEffect(() => {
        const observer = new MutationObserver(() => setThemeKey(k => k + 1));
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => observer.disconnect();
    }, []);
    const colors = useMemo(canvasColors, [themeKey]);
    const rootId = data?.rootId;
    // Stable accessors: ForceGraph2D re-styles every node whenever these identities change
    const nodeColor = useCallback((n: object) => {
        const node = n as GraphNodeData;
        return node.id === rootId ? colors.root : colorScale(colorBy === "year" ? node.year : node.citationCount, [lo, hi], colorBy === "citations", colors.missing, colors.scale);
    }, [rootId, colors, colorBy, lo, hi]);
    // force-graph sizes nodes by area (radius ∝ √val): a squared log spreads citation counts without the largest nodes colliding
    const nodeVal = useCallback((n: object) => 1.5 + 0.8 * Math.log10(((n as GraphNodeData).citationCount ?? 0) + 1) ** 2, []);
    const nodeLabel = useCallback((n: object) => {
        const node = n as GraphNodeData;
        return `<b>${escapeHtml(node.title ?? "")}</b><br/>${escapeHtml(formatAuthors(node.authors))}${node.year ? ` · ${node.year}` : ""}`;
    }, []);
    const linkColor = useCallback(() => colors.link, [colors]);

    const expand = async (node: GraphNodeData) => {
        setExpanding(node);
        setExpandError(undefined);
        try {
            const extra = await fetchExpansion(node.id, direction);
            setExpansions(prev => ({
                key: queryKey,
                graph: mergeGraph(prev.key === queryKey ? prev.graph : { nodes: [], links: [] }, { nodes: extra.nodes, links: extra.links }),
            }));
        } catch (e) {
            setExpandError(friendlyError(e).message);
        } finally {
            setExpanding(null);
        }
    };

    const exportPng = () => {
        const canvas = containerRef.current?.querySelector("canvas");
        if (!canvas) return;
        const link = Object.assign(document.createElement("a"), { href: canvas.toDataURL("image/png"), download: `citation-graph-${paperId}.png` });
        link.click();
    };

    const rootTitle = graph.nodes.find(n => n.id === data?.rootId)?.title;
    const hasLinks = graph.links.length > 0;
    const zoomBy = (factor: number) => {
        const fg = graphRef.current;
        if (fg) fg.zoom(fg.zoom() * factor, 200);
    };
    const pan = (dx: number, dy: number) => {
        const fg = graphRef.current;
        if (!fg) return;
        const centre = fg.centerAt() as unknown as { x: number; y: number };
        const step = 80 / fg.zoom();
        fg.centerAt(centre.x + dx * step, centre.y + dy * step, 200);
    };
    // One pass over the links, so the list view stays linear on large graphs
    const relations = useMemo(() => {
        const cited = new Set<string>();
        const citing = new Set<string>();
        for (const l of graph.links) {
            if (endpointId(l.source) === rootId) cited.add(endpointId(l.target));
            if (endpointId(l.target) === rootId) citing.add(endpointId(l.source));
        }
        return new Map(graph.nodes.map(n => [n.id, n.id === rootId ? "This paper"
            : cited.has(n.id) && citing.has(n.id) ? "Cites and cited by"
            : cited.has(n.id) ? "Referenced" : citing.has(n.id) ? "Cites this paper" : `${n.depth} hops away`]));
    }, [graph, rootId]);

    return (
        <div className="flex h-[calc(100dvh-var(--navbar-h))] flex-col gap-4 px-4 py-6 md:px-8">
            <PageHeader
                back={<Link href={ROUTES.paper(paperId)} className="inline-flex items-center gap-1 hover:text-foreground"><ArrowLeft className="size-4" /> Back to paper</Link>}
                title="Citation graph"
                description={rootTitle && <span className="line-clamp-1">{rootTitle}</span>}
            />

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <Segmented label="Direction" value={direction} options={GRAPH_DIRECTION_OPTIONS} onChange={setDirection} />
                <Segmented label="Depth" value={depth} options={GRAPH_DEPTH_OPTIONS} onChange={setDepth} />
                <Segmented label="Colour by" value={colorBy} options={GRAPH_COLOR_BY_OPTIONS} onChange={setColorBy} />
                <Button variant="outline" size="sm" className="ml-auto" onClick={exportPng} disabled={!hasLinks || view !== "graph"}><Download /> Export PNG</Button>
            </div>

            {hasLinks && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Colour legend">
                    <span className="flex items-center gap-2">
                        {colorBy === "year" ? range[0] || "—" : range[0].toLocaleString()}
                        <span className="flex h-2 w-32 overflow-hidden rounded-full">{SCALE_TOKENS.map(t => <span key={t} className="flex-1" style={{ background: t }} />)}</span>
                        {colorBy === "year" ? range[1] || "—" : range[1].toLocaleString()}
                        <span>{colorBy === "year" ? "publication year" : "citations"}</span>
                    </span>
                    <span>{graph.nodes.length} papers · {graph.links.length} links{isFetching && " · updating…"}</span>
                    <span>Arrows point to the cited paper · node size = citations</span>
                </div>
            )}

            <Tabs value={view} onValueChange={v => setView(v as "graph" | "list")} className="min-h-0 flex-1 gap-3">
            <TabsList>
                <TabsTrigger value="graph">Graph</TabsTrigger>
                <TabsTrigger value="list">As list</TabsTrigger>
            </TabsList>
            <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
                <TabsContent value="graph" keepMounted className="flex min-h-[480px] flex-1 data-[hidden]:hidden">
                <div
                    ref={containerRef}
                    role="figure"
                    aria-label={`Citation graph with ${graph.nodes.length} papers. Use the “As list” tab to browse them with a keyboard.`}
                    className="relative min-h-[480px] flex-1 overflow-hidden rounded-lg border bg-card"
                >
                    {size.width > 0 && hasLinks && (
                        <ForceGraph2D
                            width={size.width}
                            height={size.height}
                            graphData={graph}
                            nodeId="id"
                            nodeVal={nodeVal}
                            nodeRelSize={GRAPH_NODE_REL_SIZE}
                            nodeColor={nodeColor}
                            nodeLabel={nodeLabel}
                            linkDirectionalArrowLength={4}
                            linkDirectionalArrowRelPos={1}
                            linkColor={linkColor}
                            onNodeClick={n => select(n as GraphNodeData)}
                            onBackgroundClick={() => setSelected(null)}
                            cooldownTicks={GRAPH_COOLDOWN_TICKS}
                            ref={graphRef}
                            // Fit the settled layout into the frame once per node set (load, expand), not after every drag
                            onEngineStop={() => {
                                const key = `${queryKey}-${graph.nodes.length}`;
                                if (fittedFor.current === key) return;
                                fittedFor.current = key;
                                graphRef.current?.zoomToFit(GRAPH_ZOOM_TO_FIT_MS, GRAPH_ZOOM_TO_FIT_PADDING);
                            }}
                        />
                    )}
                    {hasLinks && (
                        <div className="absolute right-3 bottom-3 flex flex-col items-end gap-1" aria-label="Graph view controls" role="group">
                            <div className="flex gap-1">
                                <Button variant="outline" size="icon-sm" aria-label="Zoom in" onClick={() => zoomBy(1.4)}><Plus /></Button>
                                <Button variant="outline" size="icon-sm" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.4)}><Minus /></Button>
                                <Button variant="outline" size="icon-sm" aria-label="Fit to view" onClick={() => graphRef.current?.zoomToFit(GRAPH_ZOOM_TO_FIT_MS, GRAPH_ZOOM_TO_FIT_PADDING)}><Maximize /></Button>
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                                <span />
                                <Button variant="outline" size="icon-sm" aria-label="Pan up" onClick={() => pan(0, -1)}><ArrowUp /></Button>
                                <span />
                                <Button variant="outline" size="icon-sm" aria-label="Pan left" onClick={() => pan(-1, 0)}><ArrowLeft /></Button>
                                <Button variant="outline" size="icon-sm" aria-label="Pan down" onClick={() => pan(0, 1)}><ArrowDown /></Button>
                                <Button variant="outline" size="icon-sm" aria-label="Pan right" onClick={() => pan(1, 0)}><ArrowRight /></Button>
                            </div>
                        </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 *:pointer-events-auto">
                        {isPending && (
                            <div className="flex w-full max-w-sm flex-col items-center gap-3" role="status">
                                <div className="relative h-40 w-full" aria-hidden>
                                    <Skeleton className="absolute top-6 left-8 size-6 rounded-full" />
                                    <Skeleton className="absolute top-16 left-1/2 size-10 rounded-full" />
                                    <Skeleton className="absolute right-10 bottom-6 size-7 rounded-full" />
                                    <Skeleton className="absolute bottom-10 left-16 size-5 rounded-full" />
                                    <Skeleton className="absolute top-4 right-16 size-4 rounded-full" />
                                </div>
                                <p className="text-sm text-muted-foreground">Building the citation graph…</p>
                            </div>
                        )}
                        {error && <ErrorState error={error} onRetry={() => refetch()} className="max-w-md bg-card" />}
                        {data && !hasLinks && <EmptyState icon={GitFork} title="No citations found" description="OpenAlex and OpenCitations have no citation links for this paper in this direction. Try “Both”." className="max-w-sm" />}
                    </div>
                    {expandError && (
                        <div role="alert" className="absolute inset-x-4 top-4 flex items-center gap-3 rounded-md border border-destructive/40 bg-card p-2 text-sm text-destructive">
                            <span className="flex-1">{expandError}</span>
                            {selected && <Button variant="outline" size="sm" onClick={() => expand(selected)}><RotateCw /> Retry</Button>}
                            <Button variant="ghost" size="icon-sm" aria-label="Dismiss" onClick={() => setExpandError(undefined)}><X /></Button>
                        </div>
                    )}
                </div>
                </TabsContent>

                <TabsContent value="list" className="min-w-0 flex-1 overflow-auto">
                    {isPending && <Skeleton className="h-40 w-full" />}
                    {graph.nodes.length > 0 && (
                        <table className="w-full text-sm">
                            <caption className="sr-only">Papers in the citation graph</caption>
                            <thead className="text-left text-xs text-muted-foreground">
                                <tr className="border-b">
                                    <th scope="col" className="py-2 pr-3 font-medium">Title</th>
                                    <th scope="col" className="py-2 pr-3 font-medium">Year</th>
                                    <th scope="col" className="py-2 pr-3 text-right font-medium">Citations</th>
                                    <th scope="col" className="py-2 font-medium">Relation</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {graph.nodes.map(node => (
                                    <tr key={node.id} className={selected?.id === node.id ? "bg-accent/60" : undefined}>
                                        <td className="py-2 pr-3">
                                            <button type="button" className="text-left font-medium hover:text-primary hover:underline" aria-pressed={selected?.id === node.id} onClick={() => select(node)}>
                                                {node.title || "Untitled"}
                                            </button>
                                        </td>
                                        <td className="py-2 pr-3 text-muted-foreground">{node.year ?? "—"}</td>
                                        <td className="py-2 pr-3 text-right">{(node.citationCount ?? 0).toLocaleString()}</td>
                                        <td className="py-2 text-muted-foreground">{relations.get(node.id)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </TabsContent>

                {selected && (
                    <Card ref={selectedRef} tabIndex={-1} className="w-full shrink-0 self-start lg:w-80" aria-label="Selected paper">
                        <CardHeader>
                            <CardTitle as="h2" className="leading-snug">{selected.title}</CardTitle>
                            <CardDescription>{formatAuthors(selected.authors)}</CardDescription>
                            <CardAction>
                                <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={() => setSelected(null)}><X /></Button>
                            </CardAction>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3 text-sm">
                            <p className="text-muted-foreground">{selected.year ?? "Unknown year"} · {(selected.citationCount ?? 0).toLocaleString()} citations</p>
                            <div className="flex flex-wrap gap-2">
                                <Link href={ROUTES.paper(selected.id)} className={buttonVariants({ variant: "outline", size: "sm" })}>Open</Link>
                                <Button variant="outline" size="sm" disabled={!!expanding} onClick={() => expand(selected)}>
                                    {expanding?.id === selected.id ? <Loader2 className="animate-spin" /> : <Plus />} Expand
                                </Button>
                                <Link href={ROUTES.paperGraph(selected.id)} className={buttonVariants({ variant: "ghost", size: "sm" })}>Centre here</Link>
                            </div>
                            <div className="flex flex-wrap gap-2 border-t pt-3"><PaperActions paperId={selected.id} /></div>
                        </CardContent>
                    </Card>
                )}
            </div>
            </Tabs>
        </div>
    );
}
