
import { groq } from '@/lib/groq-client';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side proxy for Groq calls to protect the API key.
 */
export async function POST(req: NextRequest) {
  try {
    const { system, user, opts } = await req.json();
    
    // Security check: validate the key exists
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });
    }

    const result = await groq(system, user, opts);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
