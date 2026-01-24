import { GoogleGenAI } from "@google/genai";
import { Paper } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const SEMANTIC_SCHOLAR_API_KEY = process.env.SEMANTIC_SCHOLAR_API_KEY;

const cleanJsonString = (str: string): string => {
  return str.replace(/```json\n?|```/g, '').trim();
};

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
  // Use Gemini to finding related papers to provide the "reason" context
  try {
    const prompt = `
      Find 6 high-quality academic research papers related to the following paper:
      Title: "${paper.title}"
      Authors: ${paper.authors.join(', ')}
      Abstract: ${paper.abstract.substring(0, 300)}...

      You must return a valid JSON array of objects. Do not include any conversational text outside the JSON.
      Each object in the array must have these fields:
      - title: string
      - authors: array of strings
      - abstract: string (short summary, max 2 sentences)
      - year: string (publication year)
      - source: string (e.g., "arXiv", "Nature", "IEEE")
      - pdfUrl: string (direct link to the PDF or the landing page)
      - isOpenAccess: boolean
      - relatedReason: string (A brief, 1-sentence explanation of specifically why this paper is related to the original paper)
      
      Ensure the papers are real and valid citations if possible.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.3, 
      },
    });

    const text = response.text || "";
    const cleanedText = cleanJsonString(text);
    const papers: any[] = JSON.parse(cleanedText);
    
    return papers.map((p, index) => ({
      id: `gen-related-${Date.now()}-${index}`,
      title: p.title || "Unknown Title",
      authors: Array.isArray(p.authors) ? p.authors : [p.authors || "Unknown"],
      abstract: p.abstract || "No abstract available.",
      year: p.year?.toString() || "n.d.",
      source: p.source || "AI Recommendation",
      pdfUrl: p.pdfUrl || "",
      isOpenAccess: !!p.isOpenAccess,
      relatedReason: p.relatedReason
    }));

  } catch (error) {
    console.error("Gemini Related Papers Error:", error);
    // Return empty array instead of throwing to prevent app crash on related search failure
    return [];
  }
};