import 'server-only';
import { Paper, SSPaper, SSSearchResponse, SSRecResponse } from "@/types";
import { extractArxivPdfUrl } from "@/lib/paperServiceUtils";
import { API_URLS } from "@/constants/appText";

const SEMANTIC_SCHOLAR_API_KEY = process.env.NEXT_PUBLIC_SEMANTIC_SCHOLAR_API_KEY!;

async function makeRequest<T>(url: string, useKey: boolean, retries = 5, backoff = 1000): Promise<T | null> {
    const headers: Record<string, string> = {
        'User-Agent': 'ScholarSync/1.0',
        'Accept': 'application/json',
    };

    if (useKey && SEMANTIC_SCHOLAR_API_KEY) {
        headers['x-api-key'] = SEMANTIC_SCHOLAR_API_KEY;
    }

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers,
            next: { revalidate: 3600 }
        });

        if (!response.ok) {
            // Handle 429 Too Many Requests with exponential backoff silently (retrying)
            if (response.status === 429 && retries > 0) {
                await new Promise(resolve => setTimeout(resolve, backoff));
                return makeRequest<T>(url, useKey, retries - 1, backoff * 2);
            }

            // If we have an API key and get a 403, fallback to public tier silently
            if (useKey && response.status === 403) {
                return makeRequest<T>(url, false, retries, backoff);
            }

            // Only log if we're not retrying or falling back
            const errorBody = await response.json().catch(() => ({}));
            console.error(`[SSR Fetch] Final Error (useKey=${useKey}, url=${url}): ${response.status} ${response.statusText}`, JSON.stringify(errorBody));

            return null;
        }

        return response.json() as Promise<T>;
    } catch (error) {
        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, backoff));
            return makeRequest<T>(url, useKey, retries - 1, backoff * 2);
        }
        console.error(`[SSR Fetch] Exception (useKey=${useKey}, url=${url}):`, error);
        return null;
    }
}

function mapToPaper(p: SSPaper): Paper {
    const openAccessPdf = p.openAccessPdf;
    const arxivPdfUrl = !openAccessPdf?.url && openAccessPdf?.disclaimer
        ? extractArxivPdfUrl(openAccessPdf.disclaimer)
        : null;

    return {
        id: p.paperId || `ss-${Date.now()}-${Math.random()}`,
        title: p.title || "Unknown Title",
        authors: Array.isArray(p.authors) ? p.authors.map(a => a.name) : [],
        abstract: p.abstract || "No abstract available.",
        year: p.year?.toString() || "n.d.",
        source: p.venue || "Semantic Scholar",
        pdfUrl: arxivPdfUrl || openAccessPdf?.url || p.url || API_URLS.SEMANTIC_SCHOLAR_WEB(p.paperId || ''),
        isOpenAccess: !!openAccessPdf,
    };
}

export async function fetchPapersServer(query: string, page: number = 1): Promise<Paper[]> {
    const limit = 12;
    const offset = (page - 1) * limit;
    const url = API_URLS.SEMANTIC_SCHOLAR_SEARCH(query, offset, limit);

    const data = await makeRequest<SSSearchResponse>(url, !!SEMANTIC_SCHOLAR_API_KEY);

    if (!data || !data.data || !Array.isArray(data.data)) {
        return [];
    }

    return data.data.map(mapToPaper);
}

export async function getPaperByIdServer(paperId: string): Promise<Paper | null> {
    const url = API_URLS.SEMANTIC_SCHOLAR_PAPER(paperId);

    const data = await makeRequest<SSPaper>(url, !!SEMANTIC_SCHOLAR_API_KEY);

    if (!data) return null;

    return mapToPaper(data);
}

export async function getRelatedPapersServer(paperId: string): Promise<Paper[]> {
    const limit = 6;
    const url = API_URLS.SEMANTIC_SCHOLAR_RECOMMENDATIONS(paperId, limit);

    const data = await makeRequest<SSRecResponse>(url, !!SEMANTIC_SCHOLAR_API_KEY);

    if (!data || !data.recommendedPapers || !Array.isArray(data.recommendedPapers)) {
        return [];
    }

    return data.recommendedPapers.map(mapToPaper);
}
