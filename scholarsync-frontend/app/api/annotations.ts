import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, Schemas, unwrap } from '@/app/api/client';
import { BACKEND_URL } from '@/app/lib/constants/env.constants';
import { QUERY_KEYS } from '@/app/lib/constants/query-keys.constants';

const key = QUERY_KEYS.annotations.forPaper;

export function useAnnotations(paperId: string) {
  return useQuery({
    queryKey: key(paperId),
    queryFn: () => unwrap(api.GET('/api/v1/papers/{paperId}/annotations', { params: { path: { paperId } } })),
  });
}

/** All annotation mutations refetch the paper's annotation list. */
function useAnnotationMutation<TArgs, TResult>(paperId: string, fn: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => queryClient.invalidateQueries({ queryKey: key(paperId) }) });
}

export const useCreateAnnotation = (paperId: string) => useAnnotationMutation(paperId, (body: Schemas['AnnotationCreateRequest']) =>
  unwrap(api.POST('/api/v1/papers/{paperId}/annotations', { params: { path: { paperId } }, body })));

export const useUpdateAnnotation = (paperId: string) => useAnnotationMutation(paperId,
  ({ id, ...body }: { id: string } & Schemas['AnnotationUpdateRequest']) =>
    unwrap(api.PATCH('/api/v1/papers/{paperId}/annotations/{id}', { params: { path: { paperId, id } }, body })));

export const useDeleteAnnotation = (paperId: string) => useAnnotationMutation(paperId, (id: string) =>
  unwrap(api.DELETE('/api/v1/papers/{paperId}/annotations/{id}', { params: { path: { paperId, id } } })));

export const useResolveAnnotation = (paperId: string) => useAnnotationMutation(paperId, ({ id, resolved }: { id: string; resolved: boolean }) =>
  resolved
    ? unwrap(api.POST('/api/v1/papers/{paperId}/annotations/{id}/resolve', { params: { path: { paperId, id } } }))
    : unwrap(api.POST('/api/v1/papers/{paperId}/annotations/{id}/unresolve', { params: { path: { paperId, id } } })));

export const useReply = (paperId: string) => useAnnotationMutation(paperId, ({ id, body }: { id: string; body: string }) =>
  unwrap(api.POST('/api/v1/papers/{paperId}/annotations/{id}/replies', { params: { path: { paperId, id } }, body: { body } })));

export const useDeleteReply = (paperId: string) => useAnnotationMutation(paperId, ({ id, replyId }: { id: string; replyId: string }) =>
  unwrap(api.DELETE('/api/v1/papers/{paperId}/annotations/{id}/replies/{replyId}', { params: { path: { paperId, id, replyId } } })));

export async function downloadAnnotations(paperId: string) {
  const text = await unwrap(api.GET('/api/v1/papers/{paperId}/annotations/export', {
    params: { path: { paperId } },
    parseAs: 'text',
  }));
  const url = URL.createObjectURL(new Blob([text as string], { type: 'text/markdown' }));
  Object.assign(document.createElement('a'), { href: url, download: `annotations-${paperId}.md` }).click();
  URL.revokeObjectURL(url);
}

export const pdfUrl = (paperId: string) => `${BACKEND_URL}/api/v1/papers/${encodeURIComponent(paperId)}/pdf`;

/** Multipart upload; openapi-fetch's JSON serializer does not fit a file body. */
export function useUploadPdf(paperId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(pdfUrl(paperId), { method: 'POST', body: form, credentials: 'include' });
      if (!res.ok) {
        const problem = await res.json().catch(() => null) as { detail?: string } | null;
        throw new ApiError(res.status, problem?.detail ?? `Upload failed (${res.status})`);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.papers.detail(paperId) }),
  });
}

/** Uploader only, and only while nobody has annotated the PDF (the backend answers 409 otherwise). */
export function useRemovePdf(paperId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.DELETE('/api/v1/papers/{paperId}/pdf', { params: { path: { paperId } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.papers.detail(paperId) }),
  });
}
