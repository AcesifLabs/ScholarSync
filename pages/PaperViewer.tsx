import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Download, Loader2, BookOpen } from 'lucide-react';
import { getPaperById } from '../services/paperService';
import { Paper } from '../types';

export default function PaperViewer() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [paper, setPaper] = useState<Paper | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPaper = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const data = await getPaperById(id);
                setPaper(data);
            } catch (err) {
                console.error("Error fetching paper:", err);
                setError("Failed to load paper details. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchPaper();
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
                <Loader2 className="h-10 w-10 text-scholar-600 animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Loading paper...</p>
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
                        onClick={() => navigate(-1)}
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
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm z-10 shrink-0">
                <div className="flex items-center gap-4 min-w-0">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors shrink-0"
                        title="Back"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-sm md:text-base font-bold text-slate-800 truncate leading-tight">
                            {paper.title}
                        </h1>
                        <p className="text-xs text-slate-500 truncate">
                            {paper.authors.join(', ')} • {paper.year}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-4">
                    <a
                        href={paper.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                        title="Open in new window"
                    >
                        <ExternalLink size={14} />
                        <span>External</span>
                    </a>
                </div>
            </header>

            {/* Content / PDF View */}
            <main className="flex-1 relative overflow-hidden bg-slate-100">
                {paper.pdfUrl && paper.pdfUrl.toLowerCase().endsWith('.pdf') ? (
                    <iframe
                        src={`${paper.pdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                        className="w-full h-full border-none"
                        title={paper.title}
                        loading='eager'
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                        <div className="bg-white p-10 rounded-2xl shadow-lg border border-slate-200 max-w-lg w-full">
                            <BookOpen size={48} className="text-scholar-200 mx-auto mb-6" />
                            <h2 className="text-2xl font-bold text-slate-800 mb-4">Cannot Embed This Link</h2>
                            <p className="text-slate-600 mb-8 leading-relaxed text-lg">
                                This paper link doesn't seem to be a direct PDF file. You can still read it on the publisher's website.
                            </p>
                            <a
                                href={paper.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-3 bg-scholar-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-scholar-700 transition-all shadow-md hover:shadow-lg w-full text-lg"
                            >
                                <ExternalLink size={20} />
                                Open Publisher's Site
                            </a>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
