import { Paper } from "../types";

const SEMANTIC_SCHOLAR_API_KEY = process.env.SEMANTIC_SCHOLAR_API_KEY;

if (!SEMANTIC_SCHOLAR_API_KEY) {
    console.warn("SEMANTIC_SCHOLAR_API_KEY is not defined in the environment.");
} else {
    console.log("SEMANTIC_SCHOLAR_API_KEY is detected.");
}

export const searchPapers = async (query: string, page: number = 1): Promise<{ papers: Paper[], rawText?: string }> => {
  try {
    const limit = 12;
    const offset = (page - 1) * limit;
    
    const response = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&offset=${offset}&limit=${limit}&fields=paperId,title,authors,year,abstract,url,isOpenAccess,openAccessPdf,venue`,
      {
        headers: SEMANTIC_SCHOLAR_API_KEY ? { 'x-api-key': SEMANTIC_SCHOLAR_API_KEY } : {}
      }
    );

    if (!response.ok) {
        // Handle rate limits or other API errors
        if (response.status === 429) {
            throw new Error("Too many requests to Semantic Scholar. Please wait a moment.");
        }
        throw new Error(`Semantic Scholar API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
        return { papers: [] };
    }

    const papers: Paper[] = data.data.map((p: any) => ({
      id: p.paperId || `ss-${Date.now()}-${Math.random()}`,
      title: p.title || "Unknown Title",
      authors: Array.isArray(p.authors) ? p.authors.map((a: any) => a.name) : [],
      abstract: p.abstract || "No abstract available.",
      year: p.year?.toString() || "n.d.",
      source: p.venue || "Semantic Scholar",
      pdfUrl: p.openAccessPdf?.url || p.url || `https://www.semanticscholar.org/paper/${p.paperId}`,
      isOpenAccess: !!p.openAccessPdf,
      relatedReason: undefined
    }));

    return { papers };

  } catch (error) {
    console.error("Semantic Scholar Search Error:", error);
    throw error;
  }
};

export const findRelatedPapers = async (paper: Paper): Promise<Paper[]> => {
  try {
    const limit = 6;
    const response = await fetch(
      `https://api.semanticscholar.org/recommendations/v1/papers/forpaper/${paper.id}?limit=${limit}&fields=paperId,title,authors,year,abstract,url,isOpenAccess,openAccessPdf,venue`,
      {
        headers: SEMANTIC_SCHOLAR_API_KEY ? { 'x-api-key': SEMANTIC_SCHOLAR_API_KEY } : {}
      }
    );

    if (!response.ok) {
        if (response.status === 429) {
            throw new Error("Too many requests to Semantic Scholar. Please wait a moment.");
        }
        throw new Error(`Semantic Scholar Recommendations Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.recommendedPapers || !Array.isArray(data.recommendedPapers)) {
        return [];
    }

    return data.recommendedPapers.map((p: any) => ({
      id: p.paperId || `ss-rec-${Date.now()}-${Math.random()}`,
      title: p.title || "Unknown Title",
      authors: Array.isArray(p.authors) ? p.authors.map((a: any) => a.name) : [],
      abstract: p.abstract || "No abstract available.",
      year: p.year?.toString() || "n.d.",
      source: p.venue || "Semantic Scholar",
      pdfUrl: p.openAccessPdf?.url || p.url || `https://www.semanticscholar.org/paper/${p.paperId}`,
      isOpenAccess: !!p.openAccessPdf,
      relatedReason: `Recommended based on your interest in "${paper.title}"`
    }));

  } catch (error) {
    console.error("Semantic Scholar Recommendations Error:", error);
    return [];
  }
};