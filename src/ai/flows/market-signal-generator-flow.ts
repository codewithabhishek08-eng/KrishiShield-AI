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
    const system = `You are a professional agricultural commodity analyst for India. Respond ONLY in valid JSON.`;
    const user = `Generate 3 specific market signals for ${input.cropName} in ${input.region}. Current trend is ${input.trend || 'stable'}. 
    Consider eNAM data, weather forecasts, and harvest cycles.
    Return JSON object with key 'signals' containing an array. Schema: {emoji, title (max 5 words), detail (max 20 words), sentiment: 'bullish'|'bearish'|'neutral', pct_impact: number (-20 to +20)}.`;

    const output = await groq(system, user, {
      json: true,
      cacheKey: `signals-${input.cropName}`,
      temperature: 0.4
    });

    return output?.signals || [];
  }
);

export async function generateMarketSignals(input: { cropName: string, trend?: string }) {
  return marketSignalGeneratorFlow(input);
}
