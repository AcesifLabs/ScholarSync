import createClient from 'openapi-fetch';
import type { components, paths } from '@/app/api/api.types';
import { BACKEND_URL } from '@/app/lib/constants/env.constants';

export const api = createClient<paths>({ baseUrl: BACKEND_URL, credentials: 'include' });

export type Schemas = components['schemas'];

/** Error carrying the backend's ProblemDetail message, so pages can show "rate limited, try again". */
export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

type FetchResult<T> = { data?: T; error?: unknown; response: Response };

export async function unwrap<T>(request: Promise<FetchResult<T>>): Promise<T> {
  const { data, error, response } = await request;
  if (response.ok) return data as T;
  const detail = (error as { detail?: string } | undefined)?.detail;
  throw new ApiError(response.status, detail ?? `Request failed (${response.status})`);
}

