export const cleanJsonString = (str: string): string => {
    return str.replace(/```json\n?|```/g, '').trim();
};

// Extract arXiv PDF URL from disclaimer text
export const extractArxivPdfUrl = (disclaimer?: string): string | null => {
    if (!disclaimer) return null;

    // Match arXiv URLs in the disclaimer (e.g., https://arxiv.org/abs/2505.20279)
    // Stop matching before common punctuation (comma, period, semicolon, etc.)
    const arxivMatch = disclaimer.match(/https:\/\/arxiv\.org\/abs\/([^\s,;]+)/);
    if (arxivMatch) {
        // Convert from /abs/ to /pdf/
        return `https://arxiv.org/pdf/${arxivMatch[1]}`;
    }

    return null;
};

export const fetchWithRetry = async (url: string, options: RequestInit = {}, maxRetries: number = 5): Promise<Response> => {
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
