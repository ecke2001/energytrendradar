import { NextRequest, NextResponse } from 'next/server';
import { askAIStrategyAdvisor } from '@/lib/geminiAgent';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, history } = body;

    if (!question) {
      return NextResponse.json({ success: false, error: 'Keine Frage angegeben' }, { status: 400 });
    }

    const answer = await askAIStrategyAdvisor(question, history || []);
    return NextResponse.json({ success: true, answer });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Fehler beim AI Advisor Chat' },
      { status: 500 }
    );
  }
}
