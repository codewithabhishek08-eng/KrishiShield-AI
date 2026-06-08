'use server';
/**
 * @fileOverview A Groq-powered NDVI trend analysis flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { groq } from '@/lib/groq-client';

const NdviInsightInputSchema = z.object({
  ndvi: z.number(),
  crop: z.string(),
  location: z.string(),
  week: z.string(),
  trend_direction: z.string(),
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
    const system = `You are a precision agronomist. Respond in 2 sentences max. Use llama3-70b style.`;
    const user = `NDVI score is ${input.ndvi} for ${input.crop} in ${input.location}, week ${input.week}. Current trend: ${input.trend_direction}. Diagnose in 2 sentences and give one specific action the farmer must take today.`;

    const output = await groq(system, user, {
      temperature: 0.2,
      cacheKey: `ndvi-insight-${input.location}-${input.ndvi}`,
    });

    return { insight: typeof output === 'string' ? output : "NDVI levels are below baseline, indicating biomass stress. Action: Audit nitrogen levels and verify irrigation line pressure immediately." };
  }
);

export async function getNdviInsight(input: z.infer<typeof NdviInsightInputSchema>) {
  return ndviInsightFlow(input);
}
