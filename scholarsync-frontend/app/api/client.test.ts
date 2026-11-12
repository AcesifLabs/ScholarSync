import { describe, expect, it } from 'vitest';
import { ApiError, unwrap } from './client';

const result = <T>(status: number, data?: T, error?: unknown) => Promise.resolve({ data, error, response: new Response(null, { status }) });

describe('unwrap', () => {
  it('returns the data of an ok response', async () => {
    await expect(unwrap(result(200, { id: 'x' }))).resolves.toEqual({ id: 'x' });
    await expect(unwrap(result(204))).resolves.toBeUndefined();
  });

  it('throws an ApiError carrying the ProblemDetail detail', async () => {
    const error = await unwrap(result(403, undefined, { title: 'Forbidden', detail: 'Viewers cannot reply' })).catch(e => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 403, message: 'Viewers cannot reply' });
  });

  it.each([undefined, {}, 'plain text'])('falls back to a status message when the body is %j', async body => {
    await expect(unwrap(result(500, undefined, body))).rejects.toMatchObject({ status: 500, message: 'Request failed (500)' });
  });
});
