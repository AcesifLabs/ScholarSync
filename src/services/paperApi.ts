import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { GoogleGenAI } from "@google/genai";
import { Paper } from "@/types";
import { cleanJsonString } from "@/lib/paperServiceUtils";
import { searchPapersAction, getPaperByIdAction, getRelatedPapersAction } from './paperActions';
import { AI_PROMPTS } from '@/constants/appText';

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY!;

const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY! });

const searchWithGemini = async (query: string): Promise<Paper[]> => {
    if (!client) throw new Error("GEMINI_API_KEY is not configured");

    const prompt = AI_PROMPTS.SEARCH_PAPERS(query);

    const response = await client.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const papers = JSON.parse(cleanJsonString(text)) as Paper[];
    return papers.map((p: Paper) => ({
        ...p,
        source: p.source ? `${p.source} (via Gemini)` : "Gemini AI"
    }));
};

const recommendWithGemini = async (paper: Paper): Promise<Paper[]> => {
    if (!client) throw new Error("GEMINI_API_KEY is not configured");

    const prompt = AI_PROMPTS.RECOMMEND_PAPERS(paper.title, paper.authors.join(', '), paper.abstract);

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
                    } catch {
                        return { error: { status: 'CUSTOM_ERROR', error: result.error.message, data: null } };
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
                if (result.error) return { error: { status: 'CUSTOM_ERROR', error: result.error.message, data: null } };
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
