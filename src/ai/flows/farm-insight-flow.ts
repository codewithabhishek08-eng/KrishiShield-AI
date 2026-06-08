'use server';
/**
 * @fileOverview A Genkit flow to provide a single sharp farm-specific insight for the profile.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { groq } from '@/lib/groq-client';

const FarmInsightInputSchema = z.object({
  crop: z.string().default('tomato'),
  location: z.string().default('Nasik'),
  soil: z.string().default('Red Laterite'),
});
export type FarmInsightInput = z.infer<typeof FarmInsightInputSchema>;

const FarmInsightOutputSchema = z.object({
  insight: z.string(),
});
export type FarmInsightOutput = z.infer<typeof FarmInsightOutputSchema>;

const farmInsightFlow = ai.defineFlow(
  {
    name: 'farmInsightFlow',
    inputSchema: FarmInsightInputSchema,
    outputSchema: FarmInsightOutputSchema,
  },
  async (input) => {
    const system = `You are an expert agricultural advisor. Provide one sharp, actionable tip for the specified farm profile. One sentence, max 18 words.`;
    const user = `Farm: ${input.crop} in ${input.location}, soil: ${input.soil}, harvest in Sep. Give one critical maintenance tip.`;

    const output = await groq(system, user, {
      temperature: 0.3,
      cacheKey: `farm-insight-${input.crop}-${input.soil}`,
      cacheTTL: 14400 // 4 hours
    });

    return { insight: typeof output === 'string' ? output : "Ensure consistent drip irrigation timing to prevent moisture stress in laterite soil." };
  }
);

export async function getFarmInsight(input: FarmInsightInput): Promise<FarmInsightOutput> {
  return farmInsightFlow(input);
}
