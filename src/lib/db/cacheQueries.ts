// src/lib/db/cacheQueries.ts
import { getCached, setCache } from './cache';
import { Paper } from '@/types';

export async function getCachedSearch(
  query: string, 
  page: number
): Promise<Paper[] | null> {
  const cacheKey = `search:${query}:${page}`;
  return getCached<Paper[]>(cacheKey);
}

export async function setCachedSearch(
  query: string, 
  page: number, 
  papers: Paper[],
  ttlMinutes: number = 60
): Promise<void> {
  const cacheKey = `search:${query}:${page}`;
  await setCache(cacheKey, papers, ttlMinutes * 60);
}
