// src/lib/db/cacheWithLock.ts
import { prisma } from '@/lib/prisma';
import { getCached, setCache } from './cache';

export async function getOrSetWithLock<T>(
  key: string,
  compute: () => Promise<T>,
  ttlSeconds: number = 3600
): Promise<T> {
  // Check cache first
  const cached = await getCached<T>(key);
  if (cached !== null) return cached;
  
  // Try to acquire advisory lock to prevent stampede
  const lockId = key.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const lockResult = await prisma.$queryRaw<{ pg_try_advisory_lock: boolean }[]>`
    SELECT pg_try_advisory_lock(${lockId})
  `;
  
  if (!lockResult[0].pg_try_advisory_lock) {
    // Another process is computing, wait and retry
    await new Promise(resolve => setTimeout(resolve, 100));
    return getOrSetWithLock(key, compute, ttlSeconds);
  }
  
  try {
    // Double-check cache after acquiring lock
    const cachedAfterLock = await getCached<T>(key);
    if (cachedAfterLock !== null) return cachedAfterLock;
    
    // Compute and cache
    const result = await compute();
    await setCache(key, result, ttlSeconds);
    return result;
  } finally {
    // Release lock
    await prisma.$executeRaw`SELECT pg_advisory_unlock(${lockId})`;
  }
}
