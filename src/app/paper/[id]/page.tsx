'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, BookOpen } from 'lucide-react';
import { usePdfViewer } from '@/hooks/usePdfViewer';
import { ViewerHeader } from '@/components/viewer/ViewerHeader';
import { PdfDisplay } from '@/components/viewer/PdfDisplay';
import { PaperDetailSkeleton } from '@/components/Skeleton';

export default function PaperViewer() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();

    const {
        paper,
        loading,
        error,
        isPdf,
        verifyingPdf
    } = usePdfViewer(id);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50">
                <div className="bg-white border-b border-slate-200 py-4">
                    <div className="max-w-7xl mx-auto px-4 flex items-center">
                        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
                        </button>
                    </div>
                </div>
                <div className="py-12">
                    <PaperDetailSkeleton />
                </div>
            </div>
        );
    }

    if (error || !paper) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md w-full">
                    <div className="bg-red-50 text-red-600 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                        <BookOpen size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Error</h2>
                    <p className="text-slate-600 mb-6">{error || "Paper not found."}</p>
                    <button
                        onClick={() => router.back()}
                        className="bg-scholar-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-scholar-700 transition-colors w-full"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-slate-800">
            <ViewerHeader
                title={paper.title}
                authors={paper.authors}
                year={paper.year}
                pdfUrl={paper.pdfUrl}
                onBack={() => router.back()}
            />

            <main className="flex-1 relative overflow-hidden bg-slate-100">
                <PdfDisplay
                    isPdf={isPdf}
                    pdfUrl={paper.pdfUrl}
                    title={paper.title}
                    verifyingPdf={verifyingPdf}
                />
            </main>
        </div>
    );
}
