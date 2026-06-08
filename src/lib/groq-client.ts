
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
}

/**
 * Core Groq client module as specified.
 * Handles fetch, caching, concurrent request deduplication, and JSON validation.
 */
export async function groq(system: string, user: string, opts: GroqOptions = {}): Promise<any> {
  const startTime = Date.now();
  const {
    model = 'llama3-70b-8192',
    temperature = 0.4,
    json = false,
    cacheKey,
    cacheTTL = 3600,
    fallback
  } = opts;

  // 1. Check Cache
  if (cacheKey) {
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log(`[GROQ] ${new Date().toISOString()} | Cache Hit | ${cacheKey}`);
      return cached;
    }
  }

  // 2. Handle Concurrent Identical Requests
  if (cacheKey && pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  const fetchPromise = (async () => {
    try {
      const systemPrompt = json 
        ? `${system} Respond ONLY in valid JSON with no markdown or preamble.` 
        : system;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: user }
          ],
          temperature,
          response_format: json ? { type: 'json_object' } : undefined,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[GROQ] HTTP ERROR ${response.status}: ${errorBody}`);
        if (fallback !== undefined) return fallback;
        throw new Error(`Groq API returned ${response.status}`);
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
          // Simple validation against fallback shape if provided
          if (fallback && typeof fallback === 'object') {
            const keys = Object.keys(fallback);
            const match = keys.some(k => k in result);
            if (!match) {
              console.warn(`[GROQ] JSON Shape Mismatch for key: ${cacheKey}`);
            }
          }
        } catch (e) {
          console.error(`[GROQ] JSON PARSE FAILURE: ${content}`);
          if (fallback !== undefined) return fallback;
          throw new Error('Failed to parse Groq JSON response');
        }
      }

      // 3. Store in Cache
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
