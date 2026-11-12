import { PDF_MAX_MB } from '@/app/lib/constants/limits.constants';
export type FriendlyError = { title: string; message: string; retryable: boolean };

/**
 * Turns an API failure into copy a reader understands. Our own 4xx details are written for users, so they are
 * shown as-is; upstream (paper sources, publisher) failures are replaced with plain explanations.
 */
export function friendlyError(error: unknown): FriendlyError {
  const status = typeof (error as { status?: unknown })?.status === 'number' ? (error as { status: number }).status : undefined;
  const detail = error instanceof Error && error.message.trim() ? error.message.trim() : undefined;

  if (status === undefined) {
    return { title: "Can't reach ScholarSync", message: 'Check your connection and try again.', retryable: true };
  }
  switch (status) {
    case 400:
      return { title: 'Check your input', message: detail ?? 'Some of the details are not valid.', retryable: false };
    case 401:
      return { title: 'Sign in required', message: 'Sign in with Google to continue.', retryable: false };
    case 403:
      return { title: 'Not allowed', message: detail ?? "You don't have permission to do that.", retryable: false };
    case 404:
      return { title: 'Not found', message: "This doesn't exist, or you don't have access to it.", retryable: false };
    case 409:
      return { title: 'Already exists', message: detail ?? 'That conflicts with something you already have.', retryable: false };
    case 410:
      return { title: 'Link expired', message: detail ?? 'Ask for a new invite link.', retryable: false };
    case 413:
      return { title: 'File too large', message: `PDFs can be up to ${PDF_MAX_MB} MB.`, retryable: false };
    case 415:
      return { title: 'Unsupported file', message: 'Only PDF files can be uploaded.', retryable: false };
    case 429:
    case 503:
      return { title: 'Paper sources are busy', message: 'Too many requests right now. Try again in a minute.', retryable: true };
    case 502:
    case 504:
      return { title: "Couldn't reach the paper service", message: "The paper sources or the publisher didn't respond. Try again shortly.", retryable: true };
  }
  if (status >= 500) return { title: 'Something went wrong', message: 'The server hit an error. Try again.', retryable: true };
  return { title: 'Request failed', message: detail ?? `The request failed (${status}).`, retryable: false };
}
