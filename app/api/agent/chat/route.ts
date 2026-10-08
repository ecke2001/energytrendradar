import { NextRequest, NextResponse } from 'next/server';
import { askAIStrategyAdvisor, MAX_QUESTION_LENGTH } from '@/lib/geminiAgent';

// Only active when the app runs with a Node server (e.g. Docker). Note: there is
// no rate limiting here – add it before exposing this endpoint publicly.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const question = typeof body?.question === 'string' ? body.question.trim() : '';

  if (!question || question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json(
      { success: false, error: `Bitte eine Frage mit 1–${MAX_QUESTION_LENGTH} Zeichen angeben.` },
      { status: 400 },
    );
  }

  try {
    const answer = await askAIStrategyAdvisor(question);
    return NextResponse.json({ success: true, answer });
  } catch {
    return NextResponse.json({ success: false, error: 'Interner Fehler beim AI Advisor.' }, { status: 500 });
  }
}
