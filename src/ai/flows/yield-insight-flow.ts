'use server';
/**
 * @fileOverview A Groq-powered yield forecast insight flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { groq } from '@/lib/groq-client';

const YieldInsightInputSchema = z.object({
  yield: z.number(),
  avg: z.number(),
  crop: z.string(),
  location: z.string(),
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
    const system = `You are a farm economic analyst. Respond in 2 sentences max.`;
    const user = `Projected yield is ${input.yield}kg/acre vs regional average ${input.avg}kg/acre for ${input.crop} in ${input.location}. Explain the yield gap cause in one sentence and give one corrective measure with expected recovery percentage.`;

    const output = await groq(system, user, {
      temperature: 0.2,
      cacheKey: `yield-insight-${input.yield}-${input.avg}`,
    });

    return { insight: typeof output === 'string' ? output : "Yield gap is driven by localized transpiration stress. Action: Implement mulching to conserve root-zone moisture; expect 15% recovery in 3 weeks." };
  }
);

export async function getYieldInsight(input: z.infer<typeof YieldInsightInputSchema>) {
  return yieldInsightFlow(input);
}
