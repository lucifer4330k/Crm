import { NextRequest, NextResponse } from 'next/server';
import { processBatchWithGemini } from '@/lib/gemini';
import { CRMRecord, SkippedRecord } from '@/lib/types';

const BATCH_SIZE = 10;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { records } = body as { records: Record<string, string>[] };

    if (!records || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Invalid request: records array required' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const allSuccess: CRMRecord[] = [];
    const allSkipped: SkippedRecord[] = [];

    // Process in batches
    const batches: Record<string, string>[][] = [];
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      batches.push(records.slice(i, i + BATCH_SIZE));
    }

    for (let i = 0; i < batches.length; i++) {
      const result = await processBatchWithGemini(batches[i]);
      allSuccess.push(...result.records);
      allSkipped.push(...result.skipped);
    }

    return NextResponse.json({
      success: allSuccess,
      skipped: allSkipped,
      totalProcessed: records.length,
    });
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
