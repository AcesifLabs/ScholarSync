export interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  year: string;
  source: string;
  pdfUrl: string;
  isOpenAccess: boolean;
  relatedReason?: string;
  openAccessPdf?: string;
}

export interface Readlist {
  id: string;
  name: string;
  description?: string;
  paperIds: string[];
  createdAt: number;
}

export interface SearchState {
  isLoading: boolean;
  results: Paper[];
  error: string | null;
  query: string;
  rawResponse?: string; // Fallback if parsing fails
}

export type ViewMode = 'search' | 'readlist';

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}