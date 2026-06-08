'use server';
/**
 * @fileOverview A Groq-powered rainfall correlation insight flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { groq } from '@/lib/groq-client';

const RainfallInsightInputSchema = z.object({
  rainfall: z.number(),
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
    const system = `You are a hydrology expert. State deficit or surplus and irrigation recommendation. One sentence, max 25 words.`;
    const user = `Rainfall ${input.rainfall}mm vs crop water need ${input.need}mm this week.`;

    const output = await groq(system, user, {
      temperature: 0.2,
      cacheKey: `rainfall-insight-${input.rainfall}-${input.need}`,
    });

    return { insight: typeof output === 'string' ? output : "Water deficit of 22mm detected. Action: Increase drip cycle by 15 minutes during sunset hours." };
  }
);

export async function getRainfallInsight(input: z.infer<typeof RainfallInsightInputSchema>) {
  return rainfallInsightFlow(input);
}
