'use server';
/**
 * @fileOverview A Groq-powered NDVI trend analysis flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { groq } from '@/lib/groq-client';

const NdviInsightInputSchema = z.object({
  crop: z.string(),
  location: z.string(),
  current: z.number(),
  previous: z.number(),
});

const NdviInsightOutputSchema = z.object({
  insight: z.string(),
});

const ndviInsightFlow = ai.defineFlow(
  {
    name: 'ndviInsightFlow',
    inputSchema: NdviInsightInputSchema,
    outputSchema: NdviInsightOutputSchema,
  },
  async (input) => {
    const system = `You are a precision agronomist. Provide a one-sentence trend diagnosis and one actionable fix. Max 25 words.`;
    const user = `NDVI dropped from ${input.previous} to ${input.current} over 30 days for ${input.crop} in ${input.location}.`;

    const output = await groq(system, user, {
      temperature: 0.2,
      cacheKey: `ndvi-insight-${input.location}-${input.current}`,
    });

    return { insight: typeof output === 'string' ? output : "Biomass vigor is declining. Action: Audit nitrogen application levels immediately." };
  }
);

export async function getNdviInsight(input: z.infer<typeof NdviInsightInputSchema>) {
  return ndviInsightFlow(input);
}
