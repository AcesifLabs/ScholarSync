import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { GoogleGenAI } from "@google/genai";
import { Paper } from "../types";
import { cleanJsonString, extractArxivPdfUrl, fetchWithRetry } from "../lib/paperServiceUtils";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SEMANTIC_SCHOLAR_API_KEY = process.env.SEMANTIC_SCHOLAR_API_KEY;

const client = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

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

    const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const papers = JSON.parse(cleanJsonString(text));
    return papers.map((p) => ({
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

    const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return JSON.parse(cleanJsonString(text));
};

export const paperApi = createApi({
    reducerPath: 'paperApi',
    baseQuery: fetchBaseQuery({ baseUrl: '/' }),
    endpoints: (builder) => ({
        searchPapers: builder.query<{ papers: Paper[], rawText?: string }, { query: string, page?: number }>({
            queryFn: async ({ query, page = 1 }) => {
                try {
                    const limit = 12;
                    const offset = (page - 1) * limit;

                    const response = await fetchWithRetry(
                        `/api/ss/graph/v1/paper/search?query=${encodeURIComponent(query)}&offset=${offset}&limit=${limit}&fields=paperId,title,authors,year,abstract,url,isOpenAccess,openAccessPdf,venue`,
                        {
                            headers: SEMANTIC_SCHOLAR_API_KEY ? { 'x-api-key': SEMANTIC_SCHOLAR_API_KEY } : {}
                        }
                    );

                    if (response.status === 429) {
                        console.warn("Semantic Scholar rate limit hit, falling back to Gemini for search");
                        const papers = await searchWithGemini(query);
                        return { data: { papers } };
                    }

                    if (!response.ok) {
                        throw new Error(`Semantic Scholar API Error: ${response.status} ${response.statusText}`);
                    }

                    const data = await response.json();

                    if (!data.data || !Array.isArray(data.data)) {
                        return { data: { papers: [] } };
                    }

                    const papers: Paper[] = data.data.map((p) => {
                        const arxivPdfUrl = !p.openAccessPdf?.url && p.openAccessPdf?.disclaimer
                            ? extractArxivPdfUrl(p.openAccessPdf.disclaimer)
                            : null;

                        return {
                            id: p.paperId || `ss-${Date.now()}-${Math.random()}`,
                            title: p.title || "Unknown Title",
                            authors: Array.isArray(p.authors) ? p.authors.map((a) => a.name) : [],
                            abstract: p.abstract || "No abstract available.",
                            year: p.year?.toString() || "n.d.",
                            source: p.venue || "Semantic Scholar",
                            pdfUrl: arxivPdfUrl || p.openAccessPdf?.url || p.url || `https://www.semanticscholar.org/paper/${p.paperId}`,
                            isOpenAccess: !!p.openAccessPdf,
                            relatedReason: undefined
                        };
                    });

                    return { data: { papers } };

                } catch (error) {
                    console.error("Search Error:", error);
                    try {
                        console.warn("Attempting Gemini fallback after search error");
                        const papers = await searchWithGemini(query);
                        return { data: { papers } };
                    } catch {
                        return { error: { status: 500, data: error } };
                    }
                }
            },
            async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    data.papers.forEach(paper => {
                        dispatch(
                            paperApi.util.upsertQueryData('getPaperById', paper.id, paper)
                        );
                    });
                } catch {
                    // ignore
                }
            },
        }),
        getPaperById: builder.query<Paper, string>({
            queryFn: async (paperId) => {
                try {
                    const response = await fetchWithRetry(
                        `/api/ss/graph/v1/paper/${paperId}?fields=paperId,title,authors,year,abstract,url,isOpenAccess,openAccessPdf,venue`,
                        {
                            headers: SEMANTIC_SCHOLAR_API_KEY ? { 'x-api-key': SEMANTIC_SCHOLAR_API_KEY } : {}
                        }
                    );

                    if (!response.ok) {
                        throw new Error(`Semantic Scholar Get Paper Error: ${response.status} ${response.statusText}`);
                    }

                    const p = await response.json();

                    const arxivPdfUrl = !p.openAccessPdf?.url && p.openAccessPdf?.disclaimer
                        ? extractArxivPdfUrl(p.openAccessPdf.disclaimer)
                        : null;

                    const paper: Paper = {
                        id: p.paperId,
                        title: p.title || "Unknown Title",
                        authors: Array.isArray(p.authors) ? p.authors.map((a) => a.name) : [],
                        abstract: p.abstract || "No abstract available.",
                        year: p.year?.toString() || "n.d.",
                        source: p.venue || "Semantic Scholar",
                        pdfUrl: arxivPdfUrl || p.openAccessPdf?.url || p.url || `https://www.semanticscholar.org/paper/${p.paperId}`,
                        isOpenAccess: !!p.openAccessPdf,
                        relatedReason: undefined
                    };

                    return { data: paper };

                } catch (error) {
                    console.error("Semantic Scholar Get Paper Error:", error);
                    return { error: { status: 500, data: error } };
                }
            },
        }),
        getRelatedPapers: builder.query<Paper[], Paper>({
            queryFn: async (paper) => {
                try {
                    const limit = 6;
                    const response = await fetchWithRetry(
                        `/api/ss/recommendations/v1/papers/forpaper/${paper.id}?limit=${limit}&fields=paperId,title,authors,year,abstract,url,isOpenAccess,openAccessPdf,venue`,
                        {
                            headers: SEMANTIC_SCHOLAR_API_KEY ? { 'x-api-key': SEMANTIC_SCHOLAR_API_KEY } : {}
                        }
                    );

                    if (response.status === 429) {
                        console.warn("Semantic Scholar rate limit hit, falling back to Gemini for recommendations");
                        const papers = await recommendWithGemini(paper);
                        return { data: papers };
                    }

                    if (!response.ok) {
                        throw new Error(`Semantic Scholar Recommendations Error: ${response.status} ${response.statusText}`);
                    }

                    const data = await response.json();

                    if (!data.recommendedPapers || !Array.isArray(data.recommendedPapers)) {
                        return { data: [] };
                    }

                    const papers = data.recommendedPapers.map((p: any) => {
                        const arxivPdfUrl = !p.openAccessPdf?.url && p.openAccessPdf?.disclaimer
                            ? extractArxivPdfUrl(p.openAccessPdf.disclaimer)
                            : null;

                        return {
                            id: p.paperId || `ss-rec-${Date.now()}-${Math.random()}`,
                            title: p.title || "Unknown Title",
                            authors: Array.isArray(p.authors) ? p.authors.map((a) => a.name) : [],
                            abstract: p.abstract || "No abstract available.",
                            year: p.year?.toString() || "n.d.",
                            source: p.venue || "Semantic Scholar",
                            pdfUrl: arxivPdfUrl || p.openAccessPdf?.url || p.url || `https://www.semanticscholar.org/paper/${p.paperId}`,
                            isOpenAccess: !!p.openAccessPdf,
                            relatedReason: `Recommended based on your interest in "${paper.title}"`
                        };
                    });

                    return { data: papers };

                } catch (error) {
                    console.error("Semantic Scholar Recommendations Error:", error);
                    try {
                        console.warn("Attempting Gemini fallback after recommendation error");
                        const papers = await recommendWithGemini(paper);
                        return { data: papers };
                    } catch {
                        return { data: [] };
                    }
                }
            },
            async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
                try {
                    const { data: papers } = await queryFulfilled;
                    papers.forEach(paper => {
                        dispatch(
                            paperApi.util.upsertQueryData('getPaperById', paper.id, paper)
                        );
                    });
                } catch {
                    // ignore
                }
            },
        }),
    }),
});

export const { useLazySearchPapersQuery, useGetPaperByIdQuery, useLazyGetPaperByIdQuery, useLazyGetRelatedPapersQuery } = paperApi;
