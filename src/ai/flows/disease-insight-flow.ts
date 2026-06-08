'use server';
/**
 * @fileOverview A Groq-powered disease probability insight flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { groq } from '@/lib/groq-client';

const DiseaseInsightInputSchema = z.object({
  prob: z.number(),
  crop: z.string(),
  h: z.number(),
  t: z.number(),
  mm: z.number(),
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
    const system = `You are a plant pathologist. Respond in 2 sentences max.`;
    const user = `Disease probability is ${input.prob}% for ${input.crop}. Humidity ${input.h}%, Temp ${input.t}°C, recent rainfall ${input.mm}mm. Name the most likely pathogen, explain why conditions favour it, and give the earliest intervention step.`;

    const output = await groq(system, user, {
      temperature: 0.2,
      cacheKey: `disease-insight-${input.prob}-${input.h}`,
    });

    return { insight: typeof output === 'string' ? output : "Conditions favor Early Blight due to high humidity. Action: Apply preventive copper-based fungicide within the next 24 hours." };
  }
);

export async function getDiseaseInsight(input: z.infer<typeof DiseaseInsightInputSchema>) {
  return diseaseInsightFlow(input);
}
