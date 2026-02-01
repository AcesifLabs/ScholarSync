import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { GoogleGenAI } from "@google/genai";
import { Paper } from "@/types";
import { cleanJsonString } from "@/lib/paperServiceUtils";
import { searchPapersAction, getPaperByIdAction, getRelatedPapersAction } from './paperActions';

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY!;

const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY! });

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

    const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return JSON.parse(cleanJsonString(text));
};

export const paperApi = createApi({
    reducerPath: 'paperApi',
    baseQuery: fetchBaseQuery({ baseUrl: '/' }),
    endpoints: (builder) => ({
        searchPapers: builder.query<{ papers: Paper[], rawText?: string }, { query: string, page?: number }>({
            queryFn: async ({ query, page = 1 }) => {
                const result = await searchPapersAction(query, page);

                if (result.error) {
                    console.warn("Server search failed, falling back to Gemini");
                    try {
                        const papers = await searchWithGemini(query);
                        return { data: { papers } };
                    } catch (err) {
                        return { error: result.error };
                    }
                }

                if (result.data?.papers.length === 0) {
                    try {
                        const papers = await searchWithGemini(query);
                        return { data: { papers } };
                    } catch {
                        return { data: { papers: [] } };
                    }
                }

                return { data: result.data as { papers: Paper[] } };
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
                const result = await getPaperByIdAction(paperId);
                if (result.error) return { error: result.error };
                return { data: result.data as Paper };
            },
        }),
        getRelatedPapers: builder.query<Paper[], Paper>({
            queryFn: async (paper) => {
                const result = await getRelatedPapersAction(paper.id);

                if (result.error || result.data?.length === 0) {
                    console.warn("Server recommendations failed, falling back to Gemini");
                    try {
                        const papers = await recommendWithGemini(paper);
                        return { data: papers };
                    } catch {
                        return { data: [] };
                    }
                }

                return { data: result.data as Paper[] };
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
