// src/lib/db/cache.ts
import { prisma } from '@/lib/prisma';

export async function getCached<T>(key: string): Promise<T | null> {
  const result = await prisma.$queryRaw<{ value: T }[]>`
    SELECT value FROM cache 
    WHERE key = ${key} 
    AND expires_at > NOW()
  `;
  
  return result.length > 0 ? (result[0].value as T) : null;
}

export async function setCache<T>(
  key: string, 
  value: T, 
  ttlSeconds: number = 3600
): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO cache (key, value, expires_at)
    VALUES (
      ${key},
      ${JSON.stringify(value)}::jsonb,
      NOW() + (INTERVAL '1 second' * ${ttlSeconds})
    )
    ON CONFLICT (key)
    DO UPDATE SET
      value = EXCLUDED.value,
      expires_at = EXCLUDED.expires_at
  `;
}

export async function deleteCache(key: string): Promise<void> {
  await prisma.$executeRaw`DELETE FROM cache WHERE key = ${key}`;
}

export async function cleanupExpiredCache(): Promise<number> {
  const result = await prisma.$executeRaw`
    DELETE FROM cache WHERE expires_at <= NOW()
  `;
  return result;
}
