import { NextRequest, NextResponse } from 'next/server';
import { searchPapers } from '@/lib/paper-service';

export async function POST(req: NextRequest) {
  try {
    const { query, page } = await req.json();
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }
    const result = await searchPapers(query, page || 1);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API Search Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
