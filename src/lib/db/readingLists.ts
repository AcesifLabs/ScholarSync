// src/lib/db/readingLists.ts
import { prisma } from '@/lib/prisma';
import { Paper, ReadingList } from '@/types';

export async function getUserReadingLists(userId: string): Promise<ReadingList[]> {
  const lists = await prisma.readingList.findMany({
    where: { userId },
    include: {
      papers: {
        include: { paper: true },
        orderBy: { addedAt: 'desc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return lists.map((list: any) => ({
    id: list.id,
    name: list.name,
    description: list.description || undefined,
    paperIds: list.papers.map((p: any) => p.paperId),
    createdAt: list.createdAt.getTime(),
    color: list.color
  }));
}

export async function createReadingList(
  userId: string, 
  name: string, 
  color?: string
): Promise<ReadingList> {
  const list = await prisma.readingList.create({
    data: {
      userId,
      name,
      color: color || '#3B82F6'
    }
  });

  return {
    id: list.id,
    name: list.name,
    paperIds: [],
    createdAt: list.createdAt.getTime(),
    color: list.color
  };
}

export async function addPaperToReadingList(
  userId: string,
  listId: string,
  paper: Paper
): Promise<void> {
  // Ensure the list belongs to the user
  const list = await prisma.readingList.findFirst({
    where: { id: listId, userId }
  });

  if (!list) return;

  // Upsert paper first (cache it)
  await prisma.paper.upsert({
    where: { id: paper.id },
    create: {
      id: paper.id,
      title: paper.title,
      authors: paper.authors,
      abstract: paper.abstract,
      year: paper.year ? parseInt(paper.year) : null,
      source: paper.source,
      pdfUrl: paper.pdfUrl,
      isOpenAccess: paper.isOpenAccess,
      openAccessPdf: paper.openAccessPdf ? JSON.parse(JSON.stringify(paper.openAccessPdf)) : null
    },
    update: {
      title: paper.title,
      authors: paper.authors,
      abstract: paper.abstract,
      year: paper.year ? parseInt(paper.year) : null,
      source: paper.source,
      pdfUrl: paper.pdfUrl,
      isOpenAccess: paper.isOpenAccess,
      openAccessPdf: paper.openAccessPdf ? JSON.parse(JSON.stringify(paper.openAccessPdf)) : null
    }
  });

  // Add to reading list
  await prisma.readingListPaper.create({
    data: {
      readingListId: listId,
      paperId: paper.id
    }
  }).catch(() => {
    // Ignore duplicate key errors (paper already in list)
  });
}

export async function removePaperFromReadingList(
  userId: string,
  listId: string,
  paperId: string
): Promise<void> {
  // First ensure the list belongs to the user
  const list = await prisma.readingList.findFirst({
    where: { id: listId, userId }
  });

  if (!list) return;

  await prisma.readingListPaper.deleteMany({
    where: {
      readingListId: listId,
      paperId
    }
  });
}

export async function deleteReadingList(userId: string, id: string): Promise<void> {
  await prisma.readingList.deleteMany({
    where: { id, userId }
  });
}

export async function renameReadingList(
  userId: string,
  id: string,
  newName: string
): Promise<void> {
  await prisma.readingList.updateMany({
    where: { id, userId },
    data: { name: newName }
  });
}

export async function updateReadingListColor(
  userId: string,
  id: string,
  color: string
): Promise<void> {
  await prisma.readingList.updateMany({
    where: { id, userId },
    data: { color }
  });
}

export async function updatePaperNote(
  userId: string,
  listId: string,
  paperId: string,
  notes: string
): Promise<void> {
  // Ensure ownership
  const list = await prisma.readingList.findFirst({
    where: { id: listId, userId }
  });

  if (!list) return;

  await prisma.readingListPaper.updateMany({
    where: {
      readingListId: listId,
      paperId
    },
    data: { notes }
  });
}
