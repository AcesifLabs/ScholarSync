import React from 'react';
import { Loader2, BookOpen, ExternalLink } from 'lucide-react';

interface PdfDisplayProps {
    isPdf: boolean | null;
    pdfUrl: string;
    title: string;
    verifyingPdf: boolean;
}

export const PdfDisplay: React.FC<PdfDisplayProps> = ({
    isPdf,
    pdfUrl,
    title,
    verifyingPdf
}) => {
    if (verifyingPdf) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="h-8 w-8 text-scholar-600 animate-spin mb-2" />
                <p className="text-slate-500 text-sm">
                    Verifying document type...
                </p>
            </div>
        );
    }

    if (isPdf) {
        return (
            <iframe
                src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                className="w-full h-full border-none"
                title={title}
                loading='eager'
            />
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="bg-white p-10 rounded-2xl shadow-lg border border-slate-200 max-w-lg w-full">
                <BookOpen size={48} className="text-scholar-200 mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-slate-800 mb-4">
                    Cannot Embed This Link
                </h2>
                <p className="text-slate-600 mb-8 leading-relaxed text-lg">
                    This paper link doesn't seem to be embeddable. You can still read it on the publisher's website.
                </p>
                <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-3 bg-scholar-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-scholar-700 transition-all shadow-md hover:shadow-lg w-full text-lg"
                >
                    <ExternalLink size={20} />
                    Open Publisher's Site
                </a>
            </div>
        </div>
    );
};
