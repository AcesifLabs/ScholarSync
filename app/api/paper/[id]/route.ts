import { NextRequest, NextResponse } from 'next/server';
import { getPaperById } from '@/lib/paper-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const paper = await getPaperById(id);
    return NextResponse.json(paper);
  } catch (error: any) {
    console.error('API Get Paper Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
