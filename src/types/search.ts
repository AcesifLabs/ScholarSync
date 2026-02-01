import { Paper } from './models';

export interface SearchState {
  isLoading: boolean;
  results: Paper[];
  error: string | null;
  query: string;
  rawResponse?: string;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}
