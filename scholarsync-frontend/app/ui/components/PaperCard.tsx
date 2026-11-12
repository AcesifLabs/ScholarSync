'use client';

import Link from "next/link";
import React from "react";
import { FileText } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { Schemas } from "@/app/api/client";
import { sourceLabels } from "@/app/lib/utils/paper";
import { ROUTES } from "@/app/lib/constants/routes.constants";
import { PaperOriginProvider, usePaperOrigin } from "@/app/ui/components/PaperOrigin";
import type { PaperOrigin } from "@/app/lib/utils/paper";

const MAX_AUTHORS = 3;

type Props = {
    paper: Pick<Schemas['PaperSummary'], 'id' | 'title' | 'authors' | 'year' | 'venue' | 'citationCount'>
        & Partial<Pick<Schemas['PaperSummary'], 'abstractText' | 'openAccess' | 'sources' | 'hasPdf'>>;
    actions?: React.ReactNode;
    /** Extra content under the row body (notes, "shared by", etc.). */
    footer?: React.ReactNode;
    /** Hides the abstract (compact lists). */
    compact?: boolean;
    /** Tags the row for {@link exitRow}, when it can be removed with an exit animation. */
    exitKey?: string;
};

/** One paper as a row of a {@link PaperList}: title, authors, metadata, a two-line abstract and actions. */
export function PaperCard({ paper, actions, footer, compact, exitKey }: Props) {
    const sources = sourceLabels(paper.sources);
    const origin = usePaperOrigin();
    return (
        <article data-exit={exitKey} className="flex flex-col gap-1.5 py-4">
            <h3 className="text-base leading-snug font-semibold text-pretty">
                <Link href={ROUTES.paper(paper.id, origin)} className="hover:text-primary hover:underline">{paper.title}</Link>
            </h3>
            <p className="text-sm text-foreground/80">
                {paper.authors.length === 0 ? "Unknown authors" : paper.authors.slice(0, MAX_AUTHORS).map((author, i) => (
                    <React.Fragment key={`${author.id ?? author.name}-${i}`}>
                        {i > 0 && ", "}
                        {author.id
                            ? <Link href={ROUTES.researcher(author.id)} className="hover:text-primary hover:underline">{author.name}</Link>
                            : author.name}
                    </React.Fragment>
                ))}
                {paper.authors.length > MAX_AUTHORS && " et al."}
            </p>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                {[paper.year, paper.venue].filter(Boolean).map((v, i) => <span key={i} className="max-w-xs truncate">{v}</span>)}
                <span>{(paper.citationCount ?? 0).toLocaleString()} citations</span>
                {paper.hasPdf
                    ? <span className="inline-flex items-center gap-1 font-medium text-success"><FileText className="size-3.5" aria-hidden />PDF</span>
                    : paper.openAccess && <span className="font-medium text-success">Open access</span>}
                {sources.length > 0 && <span title="Sources this record was merged from">via {sources.join(", ")}</span>}
            </p>
            {!compact && paper.abstractText && <p className="line-clamp-2 max-w-[80ch] text-sm text-muted-foreground">{paper.abstractText}</p>}
            {actions && <div className="flex flex-wrap items-center gap-2 pt-1.5">{actions}</div>}
            {footer}
        </article>
    );
}

/** Hairline-divided list of paper rows. */
export function PaperList({ children, className = "", origin }: { children: React.ReactNode; className?: string; origin?: PaperOrigin }) {
    const list = <div className={`flex flex-col divide-y border-y *:enter ${className}`}>{children}</div>;
    return origin ? <PaperOriginProvider value={origin}>{list}</PaperOriginProvider> : list;
}

/** "Read" link for papers that have a PDF. */
export function ReadLink({ paperId, className = "" }: { paperId: string; className?: string }) {
    return (
        <Link href={ROUTES.paperRead(paperId)} className={buttonVariants({ variant: "outline", size: "sm", className })}>
            <FileText aria-hidden /> Read
        </Link>
    );
}
