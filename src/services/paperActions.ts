'use server';

import { Paper } from "@/types";
import { fetchPapersServer, getPaperByIdServer, getRelatedPapersServer } from "./paperService.server";
import { ERROR_MESSAGES } from "@/constants/appText";

export async function searchPapersAction(query: string, page: number = 1): Promise<{ data?: { papers: Paper[] }, error?: { message: string } }> {
    try {
        const papers = await fetchPapersServer(query, page);
        return { data: { papers } };
    } catch (error) {
        console.error("Search Action Error:", error);
        return { error: { message: ERROR_MESSAGES.SEARCH_FAILED_SERVER } };
    }
}

export async function getPaperByIdAction(paperId: string): Promise<{ data?: Paper, error?: { message: string } }> {
    try {
        const paper = await getPaperByIdServer(paperId);
        if (!paper) return { error: { message: ERROR_MESSAGES.PAPER_NOT_FOUND } };
        return { data: paper };
    } catch (error) {
        console.error("Get Paper Action Error:", error);
        return { error: { message: "Failed to get paper on server" } };
    }
}

export async function getRelatedPapersAction(paperId: string): Promise<{ data?: Paper[], error?: { message: string } }> {
    try {
        const papers = await getRelatedPapersServer(paperId);
        return { data: papers };
    } catch (error) {
        console.error("Related Papers Action Error:", error);
        return { error: { message: ERROR_MESSAGES.RELATED_PAPERS_FAILED } };
    }
}
