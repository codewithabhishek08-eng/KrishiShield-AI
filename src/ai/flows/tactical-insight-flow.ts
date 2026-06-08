'use server';
/**
 * @fileOverview Generic tactical insight flow that accepts a pre-built prompt.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { groq } from '@/lib/groq-client';

const TacticalInputSchema = z.object({
  prompt: z.string(),
  system: z.string().optional(),
});

export async function getTacticalInsight(input: z.infer<typeof TacticalInputSchema>) {
  const system = input.system || "You are a precision agriculture officer. Respond in 2 sentences max.";
  const res = await groq(system, input.prompt, { temperature: 0.3 });
  return { insight: typeof res === 'string' ? res : "Analysis complete. Standing by for field data." };
}

export const tacticalInsightFlow = ai.defineFlow(
  {
    name: 'tacticalInsightFlow',
    inputSchema: TacticalInputSchema,
    outputSchema: z.object({ insight: z.string() }),
  },
  async (input) => {
    return getTacticalInsight(input);
  }
);
