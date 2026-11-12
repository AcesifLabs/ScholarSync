'use client';

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { FolderPlus } from "lucide-react";
import { useAddToCollection, useCreateCollection } from "@/app/api/collections";
import { settleLimited } from "@/app/lib/utils/batch";
import { toastError } from "@/app/lib/utils/toast";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSharedCollection } from "@/app/api/collections";
import { signIn } from "@/app/api/auth";
import { useAuth } from "@/app/lib/providers/AuthProvider";
import { PaperCard } from "@/app/ui/components/PaperCard";
import { PaperActions } from "@/app/ui/components/PaperActions";
import { PaperOriginProvider } from "@/app/ui/components/PaperOrigin";
import { useDocumentTitle } from "@/app/lib/hooks/useDocumentTitle";
import { PageContainer } from "@/app/ui/components/PageContainer";
import { PageHeader } from "@/app/ui/components/PageHeader";
import { EmptyState } from "@/app/ui/components/EmptyState";
import { ErrorState } from "@/app/ui/components/ErrorState";
import { GoogleMark } from "@/app/ui/components/icons/GoogleMark";
import { ROUTES } from "@/app/lib/constants/routes.constants";

export default function SharedCollectionPage() {
    const { token } = useParams<{ token: string }>();
    const { user } = useAuth();
    const { data, error, isPending, refetch } = useSharedCollection(token);
    useDocumentTitle(data?.name);
    const router = useRouter();
    const create = useCreateCollection();
    const add = useAddToCollection();
    const [copying, setCopying] = useState(false);
    const copyAll = async () => {
        if (!data) return;
        setCopying(true);
        try {
            const created = await create.mutateAsync({ name: data.name, description: data.description || undefined });
            // One at a time, so the copy keeps the shared order
            const { failed } = await settleLimited(data.papers, 1, paper => add.mutateAsync({ id: created.id, paperId: paper.id }));
            if (failed) toast.error(`Copied with ${failed} ${failed === 1 ? "paper" : "papers"} missing. Try adding them again.`);
            else toast.success(`Saved “${created.name}” to your collections`);
            router.push(ROUTES.collection(created.id));
        } catch (e) {
            toastError(e);
        } finally {
            setCopying(false);
        }
    };

    if (isPending) return <PageContainer><Skeleton className="h-9 w-1/2" /><Skeleton className="h-40 w-full" /></PageContainer>;
    if (error || !data) return <PageContainer><ErrorState error={error} onRetry={() => refetch()} /></PageContainer>;

    return (
        <PageContainer>
            <PageHeader
                title={data.name}
                description={data.description || "A collection shared by link."}
                actions={user && data.papers.length > 0 && (
                    <Button variant="outline" disabled={copying} onClick={copyAll}><FolderPlus /> {copying ? "Saving…" : "Save as my collection"}</Button>
                )}
            />
            {!user && (
                <div className="flex flex-wrap items-center gap-3 border-y py-3">
                    <p className="flex-1 text-sm">Sign in to save these papers to your own library and collections.</p>
                    <Button onClick={() => signIn(ROUTES.sharedCollection(token))}><GoogleMark className="size-4" /> Sign in with Google</Button>
                </div>
            )}
            {data.papers.length === 0 && <EmptyState icon={FolderOpen} title="This collection is empty" />}
            {data.papers.length > 0 && (
                <PaperOriginProvider value={`shared:${token}`}>
                <ol className="flex flex-col divide-y *:enter border-y">
                    {data.papers.map(paper => (
                        <li key={paper.id}>
                            <PaperCard paper={paper} actions={user && <PaperActions paperId={paper.id} />} />
                        </li>
                    ))}
                </ol>
                </PaperOriginProvider>
            )}
        </PageContainer>
    );
}
