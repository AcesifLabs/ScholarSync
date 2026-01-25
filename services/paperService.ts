import { GoogleGenAI } from "@google/genai";
import { Paper } from "../types";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SEMANTIC_SCHOLAR_API_KEY = process.env.SEMANTIC_SCHOLAR_API_KEY;

// Use @google/genai (Next-Gen SDK)
const client = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

const cleanJsonString = (str: string): string => {
  return str.replace(/```json\n?|```/g, '').trim();
};

const searchWithGemini = async (query: string): Promise<Paper[]> => {
  if (!client) throw new Error("GEMINI_API_KEY is not configured");

  const prompt = `Find 12 real, high-quality academic research papers related to the topic: "${query}".
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
    
    Ensure the papers are real and citations are accurate.`;

  const response = await client.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  const text = response.text || "";
  const papers = JSON.parse(cleanJsonString(text));
  return papers.map((p: any) => ({
    ...p,
    source: p.source ? `${p.source} (via Gemini)` : "Gemini AI"
  }));
};

const recommendWithGemini = async (paper: Paper): Promise<Paper[]> => {
  if (!client) throw new Error("GEMINI_API_KEY is not configured");

  const prompt = `Recommend 6 academic research papers similar or highly relevant to this paper:
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
    - relatedReason: string (one concise sentence explaining why this is relevant to the original paper)`;

  const response = await client.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  const text = response.text || "";
  const papers = JSON.parse(cleanJsonString(text));
  return papers;
};

const fetchWithRetry = async (url: string, options: RequestInit = {}, maxRetries: number = 5): Promise<Response> => {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;

      // If it's a rate limit (429) or server error (5xx), retry
      if (response.status === 429 || response.status >= 500) {
        const delay = Math.pow(2, retries) * 1000 + Math.random() * 1000;
        console.warn(`Retrying in ${Math.round(delay)}ms... (Attempt ${retries + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        retries++;
        continue;
      }

      return response;
    } catch (error) {
      retries++;
      if (retries >= maxRetries) throw error;
      const delay = Math.pow(2, retries) * 1000 + Math.random() * 1000;
      console.warn(`Fetch error, retrying in ${Math.round(delay)}ms... (Attempt ${retries}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries reached");
};

export const searchPapers = async (query: string, page: number = 1): Promise<{ papers: Paper[], rawText?: string }> => {
  try {
    const limit = 12;
    const offset = (page - 1) * limit;

    const response = await fetchWithRetry(
      `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&offset=${offset}&limit=${limit}&fields=paperId,title,authors,year,abstract,url,isOpenAccess,openAccessPdf,venue`,
      {
        headers: SEMANTIC_SCHOLAR_API_KEY ? { 'x-api-key': SEMANTIC_SCHOLAR_API_KEY } : {}
      }
    );

    if (response.status === 429) {
      console.warn("Semantic Scholar rate limit hit, falling back to Gemini for search");
      const papers = await searchWithGemini(query);
      return { papers };
    }

    if (!response.ok) {
      // If not OK and was not retried (like 404 or something), we still might want fallback
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
    console.error("Search Error:", error);
    try {
      console.warn("Attempting Gemini fallback after search error");
      const papers = await searchWithGemini(query);
      return { papers };
    } catch (fallbackError) {
      throw error;
    }
  }
};

export const getPaperById = async (paperId: string): Promise<Paper> => {
  try {
    const response = await fetchWithRetry(
      `https://api.semanticscholar.org/graph/v1/paper/${paperId}?fields=paperId,title,authors,year,abstract,url,isOpenAccess,openAccessPdf,venue`,
      {
        headers: SEMANTIC_SCHOLAR_API_KEY ? { 'x-api-key': SEMANTIC_SCHOLAR_API_KEY } : {}
      }
    );

    if (!response.ok) {
      throw new Error(`Semantic Scholar Get Paper Error: ${response.status} ${response.statusText}`);
    }

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
    console.error("Semantic Scholar Get Paper Error:", error);
    throw error;
  }
};

export const findRelatedPapers = async (paper: Paper): Promise<Paper[]> => {
  try {
    const limit = 6;
    const response = await fetchWithRetry(
      `https://api.semanticscholar.org/recommendations/v1/papers/forpaper/${paper.id}?limit=${limit}&fields=paperId,title,authors,year,abstract,url,isOpenAccess,openAccessPdf,venue`,
      {
        headers: SEMANTIC_SCHOLAR_API_KEY ? { 'x-api-key': SEMANTIC_SCHOLAR_API_KEY } : {}
      }
    );

    if (response.status === 429) {
      console.warn("Semantic Scholar rate limit hit, falling back to Gemini for recommendations");
      return await recommendWithGemini(paper);
    }

    if (!response.ok) {
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
    try {
      console.warn("Attempting Gemini fallback after recommendation error");
      return await recommendWithGemini(paper);
    } catch (fallbackError) {
      return [];
    }
  }
};
