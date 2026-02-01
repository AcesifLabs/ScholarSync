// src/app/api/reading-lists/[id]/papers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import * as readingListDb from '@/lib/db/readingLists';
import { Paper } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listId } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const paper: Paper = await request.json();
    await readingListDb.addPaperToReadingList(session.user.id, listId, paper);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to add paper to reading list' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listId } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const paperId = searchParams.get('paperId');

    if (!paperId) {
      return NextResponse.json(
        { error: 'paperId is required' },
        { status: 400 }
      );
    }

    await readingListDb.removePaperFromReadingList(session.user.id, listId, paperId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to remove paper from reading list' },
      { status: 500 }
    );
  }
}
