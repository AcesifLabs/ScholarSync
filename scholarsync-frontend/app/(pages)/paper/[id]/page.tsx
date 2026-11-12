'use client';

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, BookOpen, ExternalLink, GitFork, Upload } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePaper } from "@/app/api/papers";
import { PaperActions } from "@/app/ui/components/PaperActions";
import { ReadingStatusSelect } from "@/app/ui/components/ReadingStatusSelect";
import { PageContainer } from "@/app/ui/components/PageContainer";
import { ErrorState } from "@/app/ui/components/ErrorState";
import { backTarget, externalLinks, sourceLabels } from "@/app/lib/utils/paper";
import { useDocumentTitle } from "@/app/lib/hooks/useDocumentTitle";
import { ROUTES } from "@/app/lib/constants/routes.constants";

export default function PaperPage() {
    const { id } = useParams<{ id: string }>();
    const paperId = decodeURIComponent(id);
    const target = backTarget(useSearchParams().get("from"));
    const { data: paper, error, isPending, refetch } = usePaper(paperId);
    useDocumentTitle(paper?.title);
    const back = <Link href={target.href} className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> {target.label}</Link>;

    if (isPending) {
        return (
            <PageContainer>
                {back}
                <Skeleton className="h-9 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-40 w-full max-w-[66ch]" />
            </PageContainer>
        );
    }
    if (error || !paper) return <PageContainer>{back}<ErrorState error={error} onRetry={() => refetch()} /></PageContainer>;

    const links = externalLinks(paper.externalIds);
    const sources = sourceLabels(paper.sources);

    return (
        <PageContainer>
            {back}
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
                <article className="flex min-w-0 flex-col gap-6">
                    <header className="flex flex-col gap-3">
                        <h1 className="max-w-[40ch] text-2xl leading-tight font-semibold tracking-tight text-balance md:text-[1.75rem]">{paper.title}</h1>
                        <p className="text-foreground/80">
                            {paper.authors.length === 0 && "Unknown authors"}
                            {paper.authors.map((a, i) => (
                                <span key={`${a.id ?? a.name}-${i}`}>
                                    {i > 0 && ", "}
                                    {a.id ? <Link href={ROUTES.researcher(a.id)} className="hover:text-primary hover:underline">{a.name}</Link> : a.name}
                                </span>
                            ))}
                        </p>
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                            {[paper.year, paper.venue].filter(Boolean).map((v, i) => <span key={i}>{i > 0 && <span aria-hidden className="mr-2">·</span>}{v}</span>)}
                            {paper.openAccess && <span className="font-medium text-success">· Open access</span>}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            <Link href={ROUTES.paperRead(paper.id)} className={buttonVariants({ size: "sm" })}>
                                {paper.hasPdf ? <><BookOpen /> Read PDF</> : <><Upload /> Upload PDF</>}
                            </Link>
                            <PaperActions paperId={paper.id} />
                            <ReadingStatusSelect paperId={paper.id} />
                        </div>
                    </header>

                    <section className="flex flex-col gap-2" aria-labelledby="abstract-heading">
                        <h2 id="abstract-heading" className="text-sm font-semibold text-muted-foreground">Abstract</h2>
                        <p className="reading text-foreground/90">{paper.abstractText || "No abstract available."}</p>
                    </section>

                    {paper.fieldsOfStudy.length > 0 && (
                        <ul className="flex flex-wrap gap-1.5" aria-label="Fields of study">
                            {paper.fieldsOfStudy.map(f => <li key={f}><Badge variant="secondary">{f}</Badge></li>)}
                        </ul>
                    )}
                </article>

                <aside className="flex flex-col gap-6 text-sm lg:border-l lg:pl-8">
                    <dl className="grid grid-cols-2 gap-4">
                        <div><dt className="text-xs text-muted-foreground">Citations</dt><dd className="text-lg font-semibold">{(paper.citationCount ?? 0).toLocaleString()}</dd></div>
                        <div><dt className="text-xs text-muted-foreground">References</dt><dd className="text-lg font-semibold">{(paper.referenceCount ?? 0).toLocaleString()}</dd></div>
                    </dl>
                    <Link href={ROUTES.paperGraph(paper.id)} className={buttonVariants({ variant: "outline", size: "sm", className: "w-full" })}>
                        <GitFork /> Citation graph
                    </Link>
                    {sources.length > 0 && (
                        <section className="flex flex-col gap-1.5">
                            <h2 className="text-xs font-medium text-muted-foreground">Merged from</h2>
                            <ul className="flex flex-wrap gap-1.5" aria-label="Sources">
                                {sources.map(s => <li key={s}><Badge variant="outline">{s}</Badge></li>)}
                            </ul>
                        </section>
                    )}
                    {links.length > 0 && (
                        <section className="flex flex-col gap-1.5">
                            <h2 className="text-xs font-medium text-muted-foreground">Identifiers</h2>
                            {links.map(link => (
                                <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 break-all underline-offset-2 hover:underline">
                                    <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden /> {link.label}
                                </a>
                            ))}
                        </section>
                    )}
                </aside>
            </div>
        </PageContainer>
    );
}
