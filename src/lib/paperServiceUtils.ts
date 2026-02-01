export const cleanJsonString = (str: string): string => {
    return str.replace(/```json\n?|```/g, '').trim();
};

export const extractArxivPdfUrl = (disclaimer?: string): string | null => {
    if (!disclaimer) return null;

    const arxivMatch = disclaimer.match(/https:\/\/arxiv\.org\/abs\/([^\s,;]+)/);
    if (arxivMatch) {
        return `https://arxiv.org/pdf/${arxivMatch[1]}`;
    }

    return null;
};

