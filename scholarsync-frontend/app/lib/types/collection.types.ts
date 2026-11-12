import type { Schemas } from '@/app/api/client';

/** A shared-link collection: name, description and papers only. Notes, tags and the owner stay private. */
export type SharedCollectionView = Schemas['SharedCollection'];
