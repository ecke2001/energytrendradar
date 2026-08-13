import { NextRequest, NextResponse } from 'next/server';
import { generateWeeklyReportWithAI } from '@/lib/geminiAgent';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const weekNumber = body.weekNumber || 34;

    const report = await generateWeeklyReportWithAI(weekNumber);
    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Fehler bei der Report-Generierung' },
      { status: 500 }
    );
  }
}
