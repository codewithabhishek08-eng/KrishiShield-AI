
import NodeCache from 'node-cache';

const cache = new NodeCache();
const pendingRequests = new Map<string, Promise<any>>();

export interface GroqOptions {
  model?: string;
  temperature?: number;
  json?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
  fallback?: any;
  stream?: boolean;
  history?: { role: 'user' | 'assistant' | 'system'; content: string }[];
}

/**
 * Core Groq client module.
 * Handles fetch, caching, concurrent request deduplication, and JSON validation.
 */
export async function groq(system: string, user: string, opts: GroqOptions = {}): Promise<any> {
  const startTime = Date.now();
  const {
    model = 'llama-3.3-70b-versatile',
    temperature = 0.3,
    json = false,
    cacheKey,
    cacheTTL = 3600,
    fallback,
    stream = false,
    history = []
  } = opts;

  // 1. Check Cache (Only for non-streaming)
  if (!stream && cacheKey) {
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log(`[GROQ] ${new Date().toISOString()} | Cache Hit | ${cacheKey}`);
      return cached;
    }
  }

  // 2. Handle Concurrent Identical Requests (Only for non-streaming)
  if (!stream && cacheKey && pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  const messages = [
    { role: 'system', content: json ? `${system} You MUST respond in valid JSON format.` : system },
    ...history,
    { role: 'user', content: user }
  ];

  if (stream) {
    return fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        stream: true,
      }),
    });
  }

  const fetchPromise = (async () => {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          response_format: json ? { type: 'json_object' } : undefined,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[GROQ] HTTP ERROR ${response.status}: ${errorBody}`);
        if (fallback !== undefined) return fallback;
        throw new Error(`Groq API returned ${response.status}: ${errorBody}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      const tokensUsed = data.usage?.total_tokens || 0;
      const latency = Date.now() - startTime;

      console.log(`[GROQ] ${new Date().toISOString()} | Tokens: ${tokensUsed} | Latency: ${latency}ms | Model: ${model}`);

      let result = content;
      if (json) {
        try {
          result = JSON.parse(content);
        } catch (e) {
          console.error(`[GROQ] JSON PARSE FAILURE: ${content}`);
          if (fallback !== undefined) return fallback;
          throw new Error('Failed to parse Groq JSON response');
        }
      }

      if (cacheKey && cacheTTL > 0) {
        cache.set(cacheKey, result, cacheTTL);
      }

      return result;
    } catch (err) {
      console.error(`[GROQ] FATAL ERROR:`, err);
      if (fallback !== undefined) return fallback;
      throw err;
    } finally {
      if (cacheKey) pendingRequests.delete(cacheKey);
    }
  })();

  if (cacheKey) {
    pendingRequests.set(cacheKey, fetchPromise);
  }

  return fetchPromise;
}

export function clearGroqCache(key: string) {
  cache.del(key);
}
