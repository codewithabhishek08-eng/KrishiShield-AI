'use server';
/**
 * @fileOverview A Genkit flow to generate high-fidelity market signals for the trading terminal.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { groq } from '@/lib/groq-client';

const MarketSignalInputSchema = z.object({
  crop: z.string().default('tomato'),
  region: z.string().default('Nasik, Maharashtra'),
});
export type MarketSignalInput = z.infer<typeof MarketSignalInputSchema>;

const MarketSignalSchema = z.object({
  emoji: z.string(),
  title: z.string(),
  detail: z.string(),
  sentiment: z.enum(['bullish', 'bearish', 'neutral']),
  pct_impact: z.number(),
});

const MarketSignalOutputSchema = z.array(MarketSignalSchema);
export type MarketSignalOutput = z.infer<typeof MarketSignalOutputSchema>;

const marketSignalGeneratorFlow = ai.defineFlow(
  {
    name: 'marketSignalGeneratorFlow',
    inputSchema: MarketSignalInputSchema,
    outputSchema: MarketSignalOutputSchema,
  },
  async (input) => {
    const system = `You are a professional agricultural commodity analyst specializing in Maharashtra, India. Respond ONLY in valid JSON.`;
    const user = `Generate 5 market signals for ${input.crop} prices in ${input.region} for the next 6 months. Consider monsoon, cold storage, fuel costs, competing crops, and eNAM auction data.
    Return JSON object with key 'signals' containing an array. Schema per item: {emoji, title (max 5 words), detail (max 20 words), sentiment: 'bullish'|'bearish'|'neutral', pct_impact: number (-20 to +20)}.`;

    const output = await groq(system, user, {
      json: true,
      cacheKey: `market-signals-terminal-${input.crop}`,
      temperature: 0.4
    });

    return output?.signals || [];
  }
);

export async function generateMarketSignals(input: MarketSignalInput = {}): Promise<MarketSignalOutput> {
  return marketSignalGeneratorFlow(input);
}
