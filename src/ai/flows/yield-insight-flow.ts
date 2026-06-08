'use server';
/**
 * @fileOverview A Groq-powered yield forecast insight flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { groq } from '@/lib/groq-client';

const YieldInsightInputSchema = z.object({
  projected: z.number(),
  average: z.number(),
});

const YieldInsightOutputSchema = z.object({
  insight: z.string(),
});

const yieldInsightFlow = ai.defineFlow(
  {
    name: 'yieldInsightFlow',
    inputSchema: YieldInsightInputSchema,
    outputSchema: YieldInsightOutputSchema,
  },
  async (input) => {
    const system = `You are a farm economic analyst. Explain yield gap in one sentence and suggest one corrective measure. Max 25 words.`;
    const user = `Projected yield ${input.projected} kg/acre vs regional average ${input.average} kg/acre.`;

    const output = await groq(system, user, {
      temperature: 0.2,
      cacheKey: `yield-insight-${input.projected}-${input.average}`,
    });

    return { insight: typeof output === 'string' ? output : "Yield lag due to soil transpiration stress. Action: Implement mulching to conserve root-zone moisture." };
  }
);

export async function getYieldInsight(input: z.infer<typeof YieldInsightInputSchema>) {
  return yieldInsightFlow(input);
}
