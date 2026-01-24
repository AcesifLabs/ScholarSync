import { Paper } from "../types";

export const searchPapers = async (query: string, page: number = 1): Promise<{ papers: Paper[] }> => {
  const response = await fetch('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, page }),
  });
  if (!response.ok) throw new Error('Search failed');
  return response.json();
};

export const getPaperById = async (paperId: string): Promise<Paper> => {
  const response = await fetch(`/api/paper/${paperId}`);
  if (!response.ok) throw new Error('Failed to fetch paper');
  return response.json();
};

export const findRelatedPapers = async (paper: Paper): Promise<Paper[]> => {
  const response = await fetch('/api/related', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paper }),
  });
  if (!response.ok) throw new Error('Failed to fetch related papers');
  return response.json();
};
