import { useState, useEffect } from 'react';
import { useGetPaperByIdQuery } from '@/services/paperApi';

export const usePdfViewer = (id: string | undefined) => {
    const { data: paper, isLoading: isPaperLoading, error: paperError } = useGetPaperByIdQuery(id!, {
        skip: !id
    });

    const [isPdf, setIsPdf] = useState<boolean | null>(null);
    const [verifyingPdf, setVerifyingPdf] = useState(false);

    useEffect(() => {
        const verifyPdf = async () => {
            if (!paper?.pdfUrl) return;

            const url = paper.pdfUrl.toLowerCase();



            if (url.endsWith('.pdf')) {
                setIsPdf(true);
            } else {
                setVerifyingPdf(true);
                try {
                    await fetch(paper.pdfUrl, { method: 'HEAD', mode: 'no-cors' });
                    if (url.includes('type=printable') || url.includes('article/file')) {
                        setIsPdf(true);
                    } else {
                        setIsPdf(paper.isOpenAccess);
                    }
                } catch (e) {
                    setIsPdf(url.includes('printable') || url.includes('download'));
                } finally {
                    setVerifyingPdf(false);
                }
            }
        };

        if (paper) {
            verifyPdf();
        }
    }, [paper]);

    return {
        paper,
        loading: isPaperLoading,
        error: paperError ? "Failed to load paper details. Please try again." : null,
        isPdf,
        verifyingPdf
    };
};
