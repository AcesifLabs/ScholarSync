import 'server-only';
import { Paper } from "@/types";
import { extractArxivPdfUrl } from "@/lib/paperServiceUtils";

const SEMANTIC_SCHOLAR_API_KEY = process.env.NEXT_PUBLIC_SEMANTIC_SCHOLAR_API_KEY!;

async function makeRequest(url: string, useKey: boolean): Promise<any | null> {
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
            const errorBody = await response.json().catch(() => ({}));
            console.error(`[SSR Fetch] Error (useKey=${useKey}, url=${url}): ${response.status} ${response.statusText}`, JSON.stringify(errorBody));

            if (useKey && response.status === 403) {
                console.warn("[SSR Fetch] 403 Forbidden with API key, falling back to public tier (no key)");
                return makeRequest(url, false);
            }

            return null;
        }

        return response.json();
    } catch (error) {
        console.error(`[SSR Fetch] Exception (useKey=${useKey}, url=${url}):`, error);
        return null;
    }
}

function mapToPaper(p: any): Paper {
    const arxivPdfUrl = !p.openAccessPdf?.url && p.openAccessPdf?.disclaimer
        ? extractArxivPdfUrl(p.openAccessPdf.disclaimer)
        : null;

    return {
        id: p.paperId || `ss-${Date.now()}-${Math.random()}`,
        title: p.title || "Unknown Title",
        authors: Array.isArray(p.authors) ? p.authors.map((a: any) => a.name) : [],
        abstract: p.abstract || "No abstract available.",
        year: p.year?.toString() || "n.d.",
        source: p.venue || "Semantic Scholar",
        pdfUrl: arxivPdfUrl || p.openAccessPdf?.url || p.url || `https://www.semanticscholar.org/paper/${p.paperId}`,
        isOpenAccess: !!p.openAccessPdf,
    };
}

export async function fetchPapersServer(query: string, page: number = 1): Promise<Paper[]> {
    const limit = 12;
    const offset = (page - 1) * limit;
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&offset=${offset}&limit=${limit}&fields=paperId,title,authors,year,abstract,url,isOpenAccess,openAccessPdf,venue`;

    const data = await makeRequest(url, !!SEMANTIC_SCHOLAR_API_KEY);

    if (!data || !data.data || !Array.isArray(data.data)) {
        return [];
    }

    return data.data.map(mapToPaper);
}

export async function getPaperByIdServer(paperId: string): Promise<Paper | null> {
    const url = `https://api.semanticscholar.org/graph/v1/paper/${paperId}?fields=paperId,title,authors,year,abstract,url,isOpenAccess,openAccessPdf,venue`;

    const data = await makeRequest(url, !!SEMANTIC_SCHOLAR_API_KEY);

    if (!data) return null;

    return mapToPaper(data);
}

export async function getRelatedPapersServer(paperId: string): Promise<Paper[]> {
    const limit = 6;
    const url = `https://api.semanticscholar.org/recommendations/v1/papers/forpaper/${paperId}?limit=${limit}&fields=paperId,title,authors,year,abstract,url,isOpenAccess,openAccessPdf,venue`;

    const data = await makeRequest(url, !!SEMANTIC_SCHOLAR_API_KEY);

    if (!data || !data.recommendedPapers || !Array.isArray(data.recommendedPapers)) {
        return [];
    }

    return data.recommendedPapers.map(mapToPaper);
}
