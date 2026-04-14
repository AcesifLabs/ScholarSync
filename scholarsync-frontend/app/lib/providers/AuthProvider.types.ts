import { User } from '@/app/lib/types/auth.types';

export type AuthContextType = {
  user: User | null | undefined; // undefined indicates the initial fetch is still in flight
  isLoading: boolean;
  logout: () => Promise<void>;
};
