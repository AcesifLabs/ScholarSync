'use server';

import { Paper } from "@/types";
import { fetchPapersServer, getPaperByIdServer, getRelatedPapersServer } from "./paperService.server";

export async function searchPapersAction(query: string, page: number = 1): Promise<{ data?: { papers: Paper[] }, error?: any }> {
    try {
        const papers = await fetchPapersServer(query, page);
        return { data: { papers } };
    } catch (error) {
        console.error("Search Action Error:", error);
        return { error: { message: "Search failed on server" } };
    }
}

export async function getPaperByIdAction(paperId: string): Promise<{ data?: Paper, error?: any }> {
    try {
        const paper = await getPaperByIdServer(paperId);
        if (!paper) return { error: { message: "Paper not found" } };
        return { data: paper };
    } catch (error) {
        console.error("Get Paper Action Error:", error);
        return { error: { message: "Failed to get paper on server" } };
    }
}

export async function getRelatedPapersAction(paperId: string): Promise<{ data?: Paper[], error?: any }> {
    try {
        const papers = await getRelatedPapersServer(paperId);
        return { data: papers };
    } catch (error) {
        console.error("Related Papers Action Error:", error);
        return { error: { message: "Failed to get related papers on server" } };
    }
}
