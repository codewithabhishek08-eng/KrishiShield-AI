'use server';
/**
 * @fileOverview A Genkit flow to generate AI-powered market signal cards using Groq.
 *
 * - generateMarketSignals - A function that handles the generation of market signals.
 * - MarketSignalInput - The input type for the generateMarketSignals function.
 * - MarketSignalOutput - The return type for the generateMarketSignals function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { groq } from '@/lib/groq-client';

const MarketSignalInputSchema = z.object({
  crop: z.string().default('tomato'),
  region: z.string().default('Maharashtra, India'),
  duration: z.string().default('next 6 months'),
});
export type MarketSignalInput = z.infer<typeof MarketSignalInputSchema>;

const MarketSignalSchema = z.object({
  icon_name: z.string(),
  title: z.string(),
  detail: z.string(),
  sentiment: z.enum(['bullish', 'bearish', 'neutral']),
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
    const system = `You are an agricultural market analyst. Generate 4 market signals for ${input.crop} prices in ${input.region} for the ${input.duration}.`;
    const user = `Return a JSON object with a single key 'signals' containing an array of 4 objects. Each object needs: icon_name (a relevant emoji), title (4 words max), detail (one sentence, max 20 words), sentiment (bullish|bearish|neutral).`;

    const output = await groq(system, user, {
      json: true,
      cacheKey: `market-signals-${input.crop}-v3`,
      temperature: 0.4
    });

    return output?.signals || [];
  }
);

export async function generateMarketSignals(input: MarketSignalInput = {}): Promise<MarketSignalOutput> {
  return marketSignalGeneratorFlow(input);
}
