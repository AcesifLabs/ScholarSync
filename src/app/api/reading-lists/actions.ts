// src/app/api/reading-lists/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import * as readingListDb from '@/lib/db/readingLists';
import { Paper, ReadingList } from '@/types';

async function getSession() {
  return await auth.api.getSession({
    headers: await headers(),
  });
}

export async function getReadingLists(): Promise<{ 
  data?: { lists: ReadingList[], papers: Record<string, Paper> }; 
  error?: string 
}> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    const result = await readingListDb.getUserReadingLists(session.user.id);
    return { data: result };
  } catch (error) {
    console.error('Failed to get reading lists:', error);
    return { error: 'Failed to fetch reading lists' };
  }
}

export async function createReadingList(
  name: string,
  color?: string
): Promise<{ data?: ReadingList; error?: string }> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    const list = await readingListDb.createReadingList(
      session.user.id,
      name,
      color
    );
    
    revalidatePath('/');
    return { data: list };
  } catch (error) {
    console.error('Failed to create reading list:', error);
    return { error: 'Failed to create reading list' };
  }
}

export async function addPaperToList(
  listId: string,
  paper: Paper
): Promise<{ success?: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    await readingListDb.addPaperToReadingList(session.user.id, listId, paper);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to add paper to list:', error);
    return { error: 'Failed to add paper to list' };
  }
}

export async function removePaperFromList(
  listId: string,
  paperId: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    await readingListDb.removePaperFromReadingList(session.user.id, listId, paperId);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to remove paper from list:', error);
    return { error: 'Failed to remove paper from list' };
  }
}

export async function deleteReadingListAction(
  id: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    await readingListDb.deleteReadingList(session.user.id, id);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete reading list:', error);
    return { error: 'Failed to delete reading list' };
  }
}

export async function renameReadingListAction(
  id: string,
  newName: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    await readingListDb.renameReadingList(session.user.id, id, newName);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to rename reading list:', error);
    return { error: 'Failed to rename reading list' };
  }
}

export async function updateReadingListColorAction(
  id: string,
  color: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    await readingListDb.updateReadingListColor(session.user.id, id, color);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to update reading list color:', error);
    return { error: 'Failed to update reading list color' };
  }
}

export async function updatePaperNoteAction(
  listId: string,
  paperId: string,
  notes: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    await readingListDb.updatePaperNote(session.user.id, listId, paperId, notes);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to update paper note:', error);
    return { error: 'Failed to update paper note' };
  }
}
