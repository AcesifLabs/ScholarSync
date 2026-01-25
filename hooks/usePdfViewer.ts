import { useState, useEffect } from 'react';
import { getPaperById } from '../services/paperService';
import { Paper } from '../types';

export const usePdfViewer = (id: string | undefined) => {
    const [paper, setPaper] = useState<Paper | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPdf, setIsPdf] = useState<boolean | null>(null);
    const [verifyingPdf, setVerifyingPdf] = useState(false);
    const [isBlockedDomain, setIsBlockedDomain] = useState(false);
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        return () => {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        };
    }, [blobUrl]);

    useEffect(() => {
        const fetchPaperAndVerifyPdf = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const data = await getPaperById(id);
                setPaper(data);

                if (data.pdfUrl) {
                    const url = data.pdfUrl.toLowerCase();

                    if (url.includes('journals.plos.org') || url.includes('plos.org')) {
                        setIsBlockedDomain(true);
                        setIsPdf(true);
                        setDownloading(true);
                        try {
                            const proxyUrl = data.pdfUrl.replace('https://journals.plos.org', '/api/pdf-proxy/plos');
                            const response = await fetch(proxyUrl);
                            const blob = await response.blob();
                            const bUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
                            setBlobUrl(bUrl);
                        } catch (e) {
                            console.error("Failed to download PDF via proxy:", e);
                        } finally {
                            setDownloading(false);
                        }
                        return;
                    }

                    if (url.endsWith('.pdf')) {
                        setIsPdf(true);
                    } else {
                        setVerifyingPdf(true);
                        try {
                            const response = await fetch(data.pdfUrl, { method: 'HEAD', mode: 'no-cors' });
                            if (url.includes('type=printable') || url.includes('article/file')) {
                                setIsPdf(true);
                            } else {
                                setIsPdf(data.isOpenAccess);
                            }
                        } catch (e) {
                            setIsPdf(url.includes('printable') || url.includes('download'));
                        } finally {
                            setVerifyingPdf(false);
                        }
                    }
                }
            } catch (err) {
                setError("Failed to load paper details. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchPaperAndVerifyPdf();
    }, [id]);

    return {
        paper,
        loading,
        error,
        isPdf,
        verifyingPdf,
        isBlockedDomain,
        blobUrl,
        downloading
    };
};
