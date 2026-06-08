'use server';
/**
 * @fileOverview Generates high-fidelity market signals for any crop.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { groq } from '@/lib/groq-client';

const MarketSignalInputSchema = z.object({
  cropName: z.string(),
  region: z.string().default('India'),
  trend: z.string().optional(),
});

const MarketSignalSchema = z.object({
  emoji: z.string(),
  title: z.string(),
  detail: z.string(),
  sentiment: z.enum(['bullish', 'bearish', 'neutral']),
  pct_impact: z.number(),
});

const MarketSignalOutputSchema = z.array(MarketSignalSchema);

const marketSignalGeneratorFlow = ai.defineFlow(
  {
    name: 'marketSignalGeneratorFlow',
    inputSchema: MarketSignalInputSchema,
    outputSchema: MarketSignalOutputSchema,
  },
  async (input) => {
    const system = `You are a professional agricultural commodity analyst for India. Respond ONLY in valid JSON.
    The 'sentiment' field MUST be exactly one of: 'bullish', 'bearish', or 'neutral' (all lowercase).`;
    const user = `Generate 3 specific market signals for ${input.cropName} in ${input.region}. Current trend is ${input.trend || 'stable'}. 
    Consider eNAM data, weather forecasts, and harvest cycles.
    Return JSON object with key 'signals' containing an array. Schema: {emoji, title (max 5 words), detail (max 20 words), sentiment: 'bullish'|'bearish'|'neutral', pct_impact: number (-20 to +20)}.`;

    const output = await groq(system, user, {
      json: true,
      cacheKey: `signals-${input.cropName}`,
      temperature: 0.4
    });

    // Normalize output to ensure enum compliance
    const signals = (output?.signals || []).map((s: any) => {
      let sentiment = String(s.sentiment || 'neutral').toLowerCase();
      if (!['bullish', 'bearish', 'neutral'].includes(sentiment)) sentiment = 'neutral';
      return {
        emoji: String(s.emoji || '📈'),
        title: String(s.title || 'Market Update'),
        detail: String(s.detail || 'Monitoring price action.'),
        sentiment: sentiment as 'bullish' | 'bearish' | 'neutral',
        pct_impact: Number(s.pct_impact) || 0,
      };
    });

    return signals;
  }
);

export async function generateMarketSignals(input: { cropName: string, trend?: string }) {
  return marketSignalGeneratorFlow(input);
}
