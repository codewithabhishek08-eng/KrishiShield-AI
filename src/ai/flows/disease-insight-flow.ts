'use server';
/**
 * @fileOverview A Groq-powered disease probability insight flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { groq } from '@/lib/groq-client';

const DiseaseInsightInputSchema = z.object({
  value: z.number(),
  humidity: z.number(),
  temp: z.number(),
});

const DiseaseInsightOutputSchema = z.object({
  insight: z.string(),
});

const diseaseInsightFlow = ai.defineFlow(
  {
    name: 'diseaseInsightFlow',
    inputSchema: DiseaseInsightInputSchema,
    outputSchema: DiseaseInsightOutputSchema,
  },
  async (input) => {
    const system = `You are a plant pathologist. Name the likely pathogen and earliest intervention window. One sentence, max 25 words.`;
    const user = `Disease probability rising to ${input.value}% given humidity ${input.humidity}% and temp ${input.temp}°C.`;

    const output = await groq(system, user, {
      temperature: 0.2,
      cacheKey: `disease-insight-${input.value}-${input.humidity}`,
    });

    return { insight: typeof output === 'string' ? output : "Potential Early Blight detected. Action: Apply copper fungicide within the 48-hour clear window." };
  }
);

export async function getDiseaseInsight(input: z.infer<typeof DiseaseInsightInputSchema>) {
  return diseaseInsightFlow(input);
}
