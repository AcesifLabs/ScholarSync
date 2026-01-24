import { NextRequest, NextResponse } from 'next/server';
import { findRelatedPapers } from '@/lib/paper-service';

export async function POST(req: NextRequest) {
  try {
    const { paper } = await req.json();
    if (!paper) {
      return NextResponse.json({ error: 'Paper is required' }, { status: 400 });
    }
    const result = await findRelatedPapers(paper);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API Related Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
