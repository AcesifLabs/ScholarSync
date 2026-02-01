export interface SSAuthor {
    name: string;
    authorId?: string;
}

export interface SSOpenAccessPdf {
    url?: string;
    status?: string;
    disclaimer?: string;
}

export interface SSPaper {
    paperId?: string;
    title?: string;
    authors?: SSAuthor[];
    year?: number;
    abstract?: string;
    url?: string;
    venue?: string;
    isOpenAccess?: boolean;
    openAccessPdf?: SSOpenAccessPdf;
}

export interface SSSearchResponse {
    total: number;
    offset: number;
    data: SSPaper[];
}

export interface SSRecResponse {
    recommendedPapers: SSPaper[];
}
