'use server';
/**
 * @fileOverview A Genkit flow to summarize weekly AI activity for the user.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { groq } from '@/lib/groq-client';

const AiWeeklySummaryInputSchema = z.object({
  stats: z.string(),
});
export type AiWeeklySummaryInput = z.infer<typeof AiWeeklySummaryInputSchema>;

const AiWeeklySummaryOutputSchema = z.object({
  summary: z.string(),
});
export type AiWeeklySummaryOutput = z.infer<typeof AiWeeklySummaryOutputSchema>;

const aiWeeklySummaryFlow = ai.defineFlow(
  {
    name: 'aiWeeklySummaryFlow',
    inputSchema: AiWeeklySummaryInputSchema,
    outputSchema: AiWeeklySummaryOutputSchema,
  },
  async (input) => {
    const system = `You are an agricultural AI assistant. Summarise the week's AI activity. One sentence, max 16 words. Enthusiastic but grounded.`;
    const user = `Stats: ${input.stats}. Summarise this activity for the farmer.`;

    const output = await groq(system, user, {
      temperature: 0.5,
      cacheKey: `ai-weekly-summary-${new Date().toDateString()}`,
    });

    return { summary: typeof output === 'string' ? output : "Your active engagement with AI insights is driving precision and reducing harvest risks." };
  }
);

export async function getAiWeeklySummary(input: AiWeeklySummaryInput): Promise<AiWeeklySummaryOutput> {
  return aiWeeklySummaryFlow(input);
}
