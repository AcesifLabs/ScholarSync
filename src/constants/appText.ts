export const API_URLS = {
    SEMANTIC_SCHOLAR_SEARCH: (query: string, offset: number, limit: number) => 
        `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&offset=${offset}&limit=${limit}&fields=paperId,title,authors,year,abstract,url,isOpenAccess,openAccessPdf,venue`,
    SEMANTIC_SCHOLAR_PAPER: (paperId: string) => 
        `https://api.semanticscholar.org/graph/v1/paper/${paperId}?fields=paperId,title,authors,year,abstract,url,isOpenAccess,openAccessPdf,venue`,
    SEMANTIC_SCHOLAR_RECOMMENDATIONS: (paperId: string, limit: number) => 
        `https://api.semanticscholar.org/recommendations/v1/papers/forpaper/${paperId}?limit=${limit}&fields=paperId,title,authors,year,abstract,url,isOpenAccess,openAccessPdf,venue`,
    ARXIV_PDF: (arxivId: string) => `https://arxiv.org/pdf/${arxivId}`,
    SEMANTIC_SCHOLAR_WEB: (paperId: string) => `https://www.semanticscholar.org/paper/${paperId}`,
};

export const ERROR_MESSAGES = {
    SEARCH_FAILED_SERVER: "Search failed on server",
    PAPER_NOT_FOUND: "Paper not found",
    RELATED_PAPERS_FAILED: "Failed to get related papers on server",
    PDF_LOAD_FAILED: "Failed to load paper details. Please try again.",
    GENERIC_SEARCH_FAILED: "Failed to fetch papers.",
    CREATE_LIST_FIRST: "Please create a readlist first.",
    LOAD_MORE_FAILED: "Failed to load more papers:",
    GRAPH_EXPAND_FAILED: "Failed to expand graph:",
    GRAPH_INIT_FAILED: "Failed to initialize graph:",
};

export const UI_TEXT = {
    APP_NAME: "ScholarSync",
    YOUR_LIBRARY: "Your Library",
    NEW_READLIST: "New Readlist",
    UNTITLED_READ_LIST: "Untitled Read List",
    UNTITLED_LIST: "Untitled List",
    UNTITLED_READING_LIST: "Untitled Reading List",
    NO_RESULTS_FOUND: (query: string) => `No results found for "${query}"`,
    NO_MORE_RELATED: "No more related papers found.",
    BACK_TO_HOME: "Back to Home",
    BACK_TO_SEARCH: "Back to Search",
    RENAME_LIST: "Rename List",
    CHANGE_COLOR: "Change Color",
    DELETE_LIST: "Delete List",
    DELETE_LIST_CONFIRM_TITLE: "Delete Readlist?",
    DELETE_LIST_CONFIRM_MESSAGE: "Are you sure you want to delete this readlist? This action cannot be undone.",
    DEFAULT_COLOR: "Default Color",
    READ_PAPER: "Read Paper",
    FIND_RELATED: "Find Related",
    REMOVE_FROM_LIST: "Remove from List",
    RESEARCH_GRAPH: "Research Graph",
    PAPERS_SAVED: (count: number) => `${count} papers saved`,
    OPEN_ACCESS: "Open Access",
    SEARCH_PLACEHOLDER: "Search for topics...",
    RESULTS_FOR: (query: string) => `Results for "${query}"`,
};

export const STORAGE_KEYS = {
    READLISTS: 'scholar_readlists',
    PAPERS: 'scholar_papers',
    ACTIVE_LIST_ID: 'scholar_active_list_id',
    SEARCH_STATE: 'scholar_search_state',
    ACTIVE_QUERY: 'scholar_active_query',
    PAGE: 'scholar_page',
    HAS_MORE: 'scholar_has_more',
};

export const AI_PROMPTS = {
    SEARCH_PAPERS: (query: string) => `Find 12 real, high-quality academic research papers related to the topic: "${query}".
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
    
    Ensure the papers are real and citations are accurate.`,
    RECOMMEND_PAPERS: (title: string, authors: string, abstract: string) => `Recommend 6 academic research papers similar or highly relevant to this paper:
    Title: "${title}"
    Authors: ${authors}
    Abstract: ${abstract.substring(0, 500)}...
    
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
    - relatedReason: string (one concise sentence explaining why this is relevant to the original paper)`,
};
