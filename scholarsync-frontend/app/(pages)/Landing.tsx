'use client';

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { SIGN_IN_REQUIRED_PARAM } from "@/app/lib/constants/auth.constants";
import { ChevronDown, FileText } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { signIn } from "@/app/api/auth";
import { GoogleMark } from "@/app/ui/components/icons/GoogleMark";
import { Avatar } from "@/app/ui/components/Avatar";
import { ROUTES } from "@/app/lib/constants/routes.constants";

const STEPS = [
    { title: "Search", text: "One query goes to OpenAlex, Crossref, Europe PMC and arXiv. Duplicates merge into one record per paper, and each record says which sources it came from." },
    { title: "Library and collections", text: "Save papers, track each as To read, In progress or Done, and arrange them into ordered collections with notes. Export to BibTeX or share by link." },
    { title: "Reader", text: "Open-access PDFs and your own uploads open in a focused reader. Highlight in four colours that mean the same thing to everyone, and comment in threads." },
    { title: "Reading groups", text: "A shared library, group annotations and a discussion per paper, with Owner, Admin, Member and Viewer roles." },
];

/** One pane of the example workflow; the content is illustrative, not a live record. */
function Pane({ area, children }: { area: string; children: React.ReactNode }) {
    return <div role="group" aria-label={area} className="flex flex-col gap-2 rounded-xl border bg-card p-4">{children}</div>;
}

function Example() {
    return (
        <figure className="flex flex-col gap-3" aria-label="An example of the workflow, with example data">
            <Pane area="Search">
                <p className="font-semibold leading-snug">Attention Is All You Need</p>
                <p className="text-sm text-foreground/80">Ashish Vaswani, Noam Shazeer, Niki Parmar et al.</p>
                <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <span>2017</span><span>NeurIPS</span>
                    <span className="inline-flex items-center gap-1 font-medium text-success"><FileText className="size-3.5" aria-hidden />PDF</span>
                    <span>via OpenAlex, Crossref, arXiv</span>
                </p>
            </Pane>
            <Pane area="Library">
                <div className="flex items-center gap-3">
                    <span className="size-4 shrink-0 rounded-[4px] border border-input" aria-hidden />
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">Attention Is All You Need</p>
                    <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border border-input px-2 text-sm">In progress <ChevronDown className="size-3.5" aria-hidden /></span>
                </div>
                <p className="pl-7 text-xs text-muted-foreground">In “Thesis, chapter 2” · page 4 of 15</p>
            </Pane>
            <Pane area="Reader">
                <p className="reading text-[0.9375rem]">
                    …we propose the Transformer, <mark className="rounded-sm px-0.5 text-inherit" style={{ background: "var(--highlight-yellow)" }}>a model architecture eschewing recurrence and instead relying entirely on an attention mechanism</mark> to draw global dependencies…
                </p>
                <p className="text-sm"><span className="font-medium">Key claim</span> · <span className="text-muted-foreground">Compare with the complexity table in section 4.</span></p>
            </Pane>
            <Pane area="Reading group · Journal club">
                <div className="flex gap-3">
                    <Avatar name="Ada Lin" size="sm" />
                    <p className="text-sm"><span className="font-medium">Ada Lin</span> <span className="text-muted-foreground">· 2h</span><br />Good one for Thursday. Read with the 2014 attention paper.</p>
                </div>
            </Pane>
            <figcaption className="text-xs text-muted-foreground">Example data. The paper is real; the highlight, note and people are made up.</figcaption>
        </figure>
    );
}

/** The signed-out home: what ScholarSync is, shown with the workflow itself. */
export function Landing() {
    const signInRequired = useSearchParams().has(SIGN_IN_REQUIRED_PARAM);
    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 py-10 md:px-8 md:py-16">
            {signInRequired && (
                <div role="status" className="-mb-8 flex flex-wrap items-center gap-3 rounded-md border border-primary/40 bg-highlight px-4 py-3 text-sm">
                    <LogIn className="size-4 text-primary" aria-hidden />
                    <span className="flex-1">Sign in to open that page. You&apos;ll go straight back to it afterwards.</span>
                    <Button size="sm" onClick={() => signIn()}><GoogleMark className="size-4" /> Sign in with Google</Button>
                </div>
            )}
            <section className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_26rem]">
                <div className="flex flex-col gap-6 lg:pt-6">
                    <h1 className="max-w-[18ch] text-4xl leading-[1.08] font-semibold tracking-tight text-balance md:text-5xl">
                        Find, read and discuss papers in one place.
                    </h1>
                    <p className="max-w-[56ch] text-lg text-muted-foreground">
                        ScholarSync searches the open scholarly record, keeps your library and collections, opens PDFs in a reader built for annotation, and gives your reading group one place to talk papers through.
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                        <Button size="lg" onClick={() => signIn()}><GoogleMark className="size-4" /> Sign in with Google</Button>
                        <Link href={ROUTES.search} className={buttonVariants({ variant: "ghost", size: "lg" })}>Search without an account</Link>
                    </div>
                    <p className="max-w-[56ch] text-sm text-muted-foreground">
                        Free to use. Metadata comes from open sources; PDFs open only when they are openly available or uploaded by you or your group.
                    </p>
                </div>
                <Example />
            </section>

            <section aria-labelledby="how-heading" className="flex flex-col gap-4">
                <h2 id="how-heading" className="text-xl font-semibold tracking-tight">From a query to a discussed paper</h2>
                <dl className="grid border-t md:grid-cols-2 lg:grid-cols-4">
                    {STEPS.map(step => (
                        <div key={step.title} className="flex flex-col gap-1.5 border-b py-5 md:pr-6 lg:border-b-0">
                            <dt className="font-medium">{step.title}</dt>
                            <dd className="text-sm text-muted-foreground">{step.text}</dd>
                        </div>
                    ))}
                </dl>
            </section>
        </div>
    );
}
