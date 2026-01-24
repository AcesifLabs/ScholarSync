import { GoogleGenAI } from "@google/genai";
import { Paper } from "../types";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SEMANTIC_SCHOLAR_API_KEY = process.env.SEMANTIC_SCHOLAR_API_KEY;

const client = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

const cleanJsonString = (str: string): string => {
  return str.replace(/```json\n?|```/g, '').trim();
};

const searchWithGemini = async (query: string): Promise<Paper[]> => {
  if (!client) throw new Error("GEMINI_API_KEY is not configured");
  
  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: `Find 12 real, high-quality academic research papers related to the topic: "${query}".
        You must return a valid JSON array of objects.
        Each object must have exactly these fields:
        - id: string (unique)
        - title: string
        - authors: string[]
        - abstract: string (comprehensive summary)
        - year: string
        - source: string (the journal, conference, or publisher name)
        - pdfUrl: string (a valid URL to the paper or its landing page)
        - isOpenAccess: boolean
        
        Ensure the papers are real and citations are accurate.` }] }],
    });

    // @ts-ignore
    const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const papers = JSON.parse(cleanJsonString(text));
    return papers.map((p: any) => ({ 
      ...p, 
      source: p.source ? `${p.source} (via Gemini)` : "Gemini AI"
    }));
  } catch (err: any) {
    console.error("Gemini Search Error:", err);
    throw err;
  }
};

const recommendWithGemini = async (paper: Paper): Promise<Paper[]> => {
  if (!client) throw new Error("GEMINI_API_KEY is not configured");
  
  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: `Recommend 6 academic research papers similar or highly relevant to this paper:
        Title: "${paper.title}"
        Authors: ${paper.authors.join(', ')}
        Abstract: ${paper.abstract.substring(0, 500)}...
        
        You must return a valid JSON array of objects.
        Each object must have exactly these fields:
        - id: string (use a prefix like 'gem-rec-' followed by a unique string)
        - title: string
        - authors: string[]
        - abstract: string
        - year: string
        - source: string
        - pdfUrl: string
        - isOpenAccess: boolean
        - relatedReason: string (one concise sentence explaining why this is relevant to the original paper)` }] }],
    });

    // @ts-ignore
    const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const papers = JSON.parse(cleanJsonString(text));
    return papers;
  } catch (err: any) {
    console.error("Gemini Recommendation Error:", err);
    throw err;
  }
};

export const searchPapers = async (query: string, page: number = 1): Promise<{ papers: Paper[] }> => {
  const tryFetch = async (useKey: boolean) => {
    const limit = 12;
    const offset = (page - 1) * limit;
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (useKey && SEMANTIC_SCHOLAR_API_KEY) {
        headers['x-api-key'] = SEMANTIC_SCHOLAR_API_KEY.trim();
    }

    return await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&offset=${offset}&limit=${limit}&fields=paperId,title,authors,year,abstract,url,isOpenAccess,openAccessPdf,venue`,
      { headers }
    );
  };

  try {
    let response = await tryFetch(true);

    if (response.status === 403 && SEMANTIC_SCHOLAR_API_KEY) {
      response = await tryFetch(false);
    }

    if (response.status === 429) {
      console.warn("Semantic Scholar rate limit hit, falling back to Gemini");
      const papers = await searchWithGemini(query);
      return { papers };
    }

    if (!response.ok) {
        throw new Error(`Semantic Scholar API Error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.data || !Array.isArray(data.data)) return { papers: [] };

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
    console.warn("Falling back to Gemini due to search error:", error);
    try {
        const papers = await searchWithGemini(query);
        return { papers };
    } catch (fallbackError) {
        throw error;
    }
  }
};

export const getPaperById = async (paperId: string): Promise<Paper> => {
  const tryFetch = async (useKey: boolean) => {
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (useKey && SEMANTIC_SCHOLAR_API_KEY) {
        headers['x-api-key'] = SEMANTIC_SCHOLAR_API_KEY.trim();
    }
    return await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/${paperId}?fields=paperId,title,authors,year,abstract,url,isOpenAccess,openAccessPdf,venue`,
      { headers }
    );
  };

  try {
    let response = await tryFetch(true);
    if (response.status === 403 && SEMANTIC_SCHOLAR_API_KEY) response = await tryFetch(false);
    
    if (!response.ok) throw new Error(`Semantic Scholar Error: ${response.status}`);

    const p = await response.json();
    return {
      id: p.paperId,
      title: p.title || "Unknown Title",
      authors: Array.isArray(p.authors) ? p.authors.map((a: any) => a.name) : [],
      abstract: p.abstract || "No abstract available.",
      year: p.year?.toString() || "n.d.",
      source: p.venue || "Semantic Scholar",
      pdfUrl: p.openAccessPdf?.url || p.url || `https://www.semanticscholar.org/paper/${p.paperId}`,
      isOpenAccess: !!p.openAccessPdf,
      relatedReason: undefined
    };
  } catch (error) {
    console.error("Get Paper Error:", error);
    throw error;
  }
};

export const findRelatedPapers = async (paper: Paper): Promise<Paper[]> => {
  const tryFetch = async (useKey: boolean) => {
    const limit = 6;
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (useKey && SEMANTIC_SCHOLAR_API_KEY) {
        headers['x-api-key'] = SEMANTIC_SCHOLAR_API_KEY.trim();
    }
    return await fetch(
      `https://api.semanticscholar.org/recommendations/v1/papers/forpaper/${paper.id}?limit=${limit}&fields=paperId,title,authors,year,abstract,url,isOpenAccess,openAccessPdf,venue`,
      { headers }
    );
  };

  try {
    let response = await tryFetch(true);
    if (response.status === 403 && SEMANTIC_SCHOLAR_API_KEY) response = await tryFetch(false);

    if (response.status === 429) return await recommendWithGemini(paper);
    if (!response.ok) throw new Error(`Recommendations Error: ${response.status}`);

    const data = await response.json();
    if (!data.recommendedPapers || !Array.isArray(data.recommendedPapers)) return [];

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
    console.warn("Falling back to Gemini due to recommendation error:", error);
    try {
        return await recommendWithGemini(paper);
    } catch (fallbackError) {
        return [];
    }
  }
};

