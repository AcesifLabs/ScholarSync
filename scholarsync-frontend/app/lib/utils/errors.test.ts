import { describe, expect, it } from 'vitest';
import { ApiError } from '@/app/api/client';
import { friendlyError } from './errors';

describe('friendlyError', () => {
  it.each([
    [401, 'Sign in required', false],
    [404, 'Not found', false],
    [413, 'File too large', false],
    [415, 'Unsupported file', false],
    [429, 'Paper sources are busy', true],
    [503, 'Paper sources are busy', true],
    [502, "Couldn't reach the paper service", true],
    [504, "Couldn't reach the paper service", true],
    [500, 'Something went wrong', true],
    [418, 'Request failed', false],
  ])('status %i → %s', (status, title, retryable) => {
    const result = friendlyError(new ApiError(status, 'raw backend text'));
    expect(result.title).toBe(title);
    expect(result.retryable).toBe(retryable);
  });

  it('hides raw upstream messages for gateway errors', () => {
    expect(friendlyError(new ApiError(502, 'OpenAlex request failed.')).message).not.toContain('request failed.');
  });

  it.each([400, 403, 409, 410])('keeps our own user-facing detail for %i', status => {
    expect(friendlyError(new ApiError(status, 'Viewers cannot reply')).message).toBe('Viewers cannot reply');
  });

  it.each([400, 403, 409, 410])('falls back to default copy when %i has no detail', status => {
    expect(friendlyError(new ApiError(status, '  ')).message.length).toBeGreaterThan(5);
  });

  it.each([new TypeError('Failed to fetch'), 'boom', null, undefined])('treats %s as a network failure', error => {
    expect(friendlyError(error)).toEqual({ title: "Can't reach ScholarSync", message: 'Check your connection and try again.', retryable: true });
  });

  it('prints the status for unknown 4xx without detail', () => {
    expect(friendlyError(new ApiError(418, '')).message).toBe('The request failed (418).');
  });
});
