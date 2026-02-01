// src/lib/db/readingLists.ts
import { prisma } from '@/lib/prisma';
import { Paper, ReadingList } from '@/types';

export async function getUserReadingLists(userId: string): Promise<{ lists: ReadingList[], papers: Record<string, Paper> }> {
  console.log(`[DB] Fetching lists for user ${userId}`);
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

  const savedPapers: Record<string, Paper> = {};
  const formattedLists = lists.map((list: any) => {
    list.papers.forEach((p: any) => {
      const paper = p.paper;
      if (paper) {
        savedPapers[paper.id] = {
          id: paper.id,
          title: paper.title,
          authors: paper.authors as string[],
          abstract: paper.abstract || '',
          year: paper.year?.toString() || 'n.d.',
          source: paper.source || '',
          pdfUrl: paper.pdfUrl || '',
          isOpenAccess: paper.isOpenAccess,
          openAccessPdf: paper.openAccessPdf as any
        };
      }
    });

    return {
      id: list.id,
      name: list.name,
      description: list.description || undefined,
      paperIds: list.papers.map((p: any) => p.paperId),
      createdAt: list.createdAt.getTime(),
      color: list.color
    };
  });

  console.log(`[DB] Found ${formattedLists.length} lists and ${Object.keys(savedPapers).length} papers`);
  return { lists: formattedLists, papers: savedPapers };
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
  console.log(`[DB] Adding paper ${paper.id} to list ${listId} for user ${userId}`);
  // Ensure the list belongs to the user
  const list = await prisma.readingList.findFirst({
    where: { id: listId, userId }
  });

  if (!list) {
    console.error(`[DB] List ${listId} not found for user ${userId}`);
    return;
  }

  // Upsert paper first (cache it)
  try {
    await prisma.paper.upsert({
      where: { id: paper.id },
      create: {
        id: paper.id,
        title: paper.title,
        authors: paper.authors,
        abstract: paper.abstract,
        year: paper.year ? (isNaN(parseInt(paper.year)) ? null : parseInt(paper.year)) : null,
        source: paper.source,
        pdfUrl: paper.pdfUrl,
        isOpenAccess: paper.isOpenAccess,
        openAccessPdf: paper.openAccessPdf ? JSON.parse(JSON.stringify(paper.openAccessPdf)) : null
      },
      update: {
        title: paper.title,
        authors: paper.authors,
        abstract: paper.abstract,
        year: paper.year ? (isNaN(parseInt(paper.year)) ? null : parseInt(paper.year)) : null,
        source: paper.source,
        pdfUrl: paper.pdfUrl,
        isOpenAccess: paper.isOpenAccess,
        openAccessPdf: paper.openAccessPdf ? JSON.parse(JSON.stringify(paper.openAccessPdf)) : null
      }
    });
    console.log(`[DB] Paper ${paper.id} upserted`);
  } catch (err) {
    console.error(`[DB] Failed to upsert paper ${paper.id}:`, err);
    throw err;
  }

  // Add to reading list
  try {
    await prisma.readingListPaper.upsert({
      where: {
        readingListId_paperId: {
          readingListId: listId,
          paperId: paper.id
        }
      },
      create: {
        readingListId: listId,
        paperId: paper.id
      },
      update: {} // Do nothing if already exists
    });
    console.log(`[DB] Paper ${paper.id} linked to list ${listId}`);
  } catch (err) {
    console.error(`[DB] Failed to link paper ${paper.id} to list ${listId}:`, err);
    throw err;
  }
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
