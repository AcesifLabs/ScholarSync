import { API_URLS } from "@/constants/appText";

export const cleanJsonString = (str: string): string => {
    return str.replace(/```json\n?|```/g, '').trim();
};

export const extractArxivPdfUrl = (disclaimer?: string): string | null => {
    if (!disclaimer) return null;

    const arxivMatch = disclaimer.match(/https:\/\/arxiv\.org\/abs\/([^\s,;]+)/);
    if (arxivMatch) {
        return API_URLS.ARXIV_PDF(arxivMatch[1]);
    }

    return null;
};

