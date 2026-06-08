'use server';
/**
 * @fileOverview A Genkit flow to generate a single sharp market insight for the terminal newswire.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { groq } from '@/lib/groq-client';

const MarketInsightInputSchema = z.object({
  crop: z.string().default('tomato'),
  region: z.string().default('Nasik'),
});
export type MarketInsightInput = z.infer<typeof MarketInsightInputSchema>;

const MarketInsightOutputSchema = z.object({
  insight: z.string(),
});
export type MarketInsightOutput = z.infer<typeof MarketInsightOutputSchema>;

const marketInsightFlow = ai.defineFlow(
  {
    name: 'marketInsightFlow',
    inputSchema: MarketInsightInputSchema,
    outputSchema: MarketInsightOutputSchema,
  },
  async (input) => {
    const system = `You are an expert market analyst. Provide one sharp, professional market insight. One sentence, max 14 words.`;
    const user = `${input.crop} market in ${input.region} today — ₹24.80/kg, bullish trend, monsoon risk. Give one actionable insight for a farmer.`;

    const output = await groq(system, user, {
      temperature: 0.2,
      cacheKey: `market-insight-${input.crop}`,
      cacheTTL: 600 // 10 min
    });

    return { insight: typeof output === 'string' ? output : "Market remains tight; verify auction volume before loading." };
  }
);

export async function getMarketInsight(input: MarketInsightInput = {}): Promise<MarketInsightOutput> {
  return marketInsightFlow(input);
}
