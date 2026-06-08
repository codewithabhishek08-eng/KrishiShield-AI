'use server';
/**
 * @fileOverview A Groq-powered rainfall correlation insight flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { groq } from '@/lib/groq-client';

const RainfallInsightInputSchema = z.object({
  deficit: z.number(),
  crop: z.string(),
  need: z.number(),
});

const RainfallInsightOutputSchema = z.object({
  insight: z.string(),
});

const rainfallInsightFlow = ai.defineFlow(
  {
    name: 'rainfallInsightFlow',
    inputSchema: RainfallInsightInputSchema,
    outputSchema: RainfallInsightOutputSchema,
  },
  async (input) => {
    const system = `You are a hydrology expert. Respond in 2 sentences max.`;
    const user = `Rainfall deficit is ${input.deficit}mm this week for ${input.crop} needing ${input.need}mm. Give a precise irrigation recommendation — method, timing, and quantity — in 2 sentences.`;

    const output = await groq(system, user, {
      temperature: 0.2,
      cacheKey: `rainfall-insight-${input.deficit}-${input.need}`,
    });

    return { insight: typeof output === 'string' ? output : "Water deficit of ${input.deficit}mm detected. Recommendation: Increase drip cycle by 15 minutes during pre-dawn hours to maximize absorption." };
  }
);

export async function getRainfallInsight(input: z.infer<typeof RainfallInsightInputSchema>) {
  return rainfallInsightFlow(input);
}
