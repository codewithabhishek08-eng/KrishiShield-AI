
import { groq } from '@/lib/groq-client';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side proxy for Groq calls to protect the API key.
 * Supports both standard and streaming responses.
 */
export async function POST(req: NextRequest) {
  try {
    const { system, user, opts } = await req.json();
    
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });
    }

    const result = await groq(system, user, opts);
    
    // If result is a Response (from streaming mode), pipe it back
    if (result instanceof Response) {
      return new Response(result.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API_GROQ] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
