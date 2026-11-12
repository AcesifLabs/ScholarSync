import { toast } from 'sonner';
import { friendlyError } from '@/app/lib/utils/errors';

/** Error toast with the same wording as ErrorState. */
export function toastError(error: unknown) {
  const { title, message } = friendlyError(error);
  toast.error(title, { description: message });
}
