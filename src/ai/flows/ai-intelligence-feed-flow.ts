'use server';
/**
 * @fileOverview This file implements a Genkit flow to generate AI-powered intelligence briefings for farmers.
 *
 * - getAiIntelligenceFeed - A function that fetches AI-generated intelligence briefings.
 * - AiIntelligenceFeedInput - The input type for the getAiIntelligenceFeed function.
 * - AiIntelligenceFeedOutput - The return type for the getAiIntelligenceFeed function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiIntelligenceFeedInputSchema = z.void();
export type AiIntelligenceFeedInput = z.infer<typeof AiIntelligenceFeedInputSchema>;

const BriefingItemSchema = z.object({
  type: z.enum(['PRICE', 'WEATHER', 'DISEASE']).describe('The type of briefing (PRICE, WEATHER, DISEASE).'),
  timestamp: z.string().regex(/^\d{2}:\d{2}$/).describe('The timestamp in HH:MM format.'),
  body: z.string().max(100).describe('The intelligence briefing message, max 40 words.'),
});

const AiIntelligenceFeedOutputSchema = z.array(BriefingItemSchema);
export type AiIntelligenceFeedOutput = z.infer<typeof AiIntelligenceFeedOutputSchema>;

const aiIntelligenceFeedPrompt = ai.definePrompt({
  name: 'aiIntelligenceFeedPrompt',
  input: {
    schema: z.object({
      currentDate: z.string().describe('The current date in a human-readable format.'),
    }),
  },
  output: {
    schema: AiIntelligenceFeedOutputSchema,
  },
  config: {
    temperature: 0.4,
  },
  prompt: `You are an agricultural intelligence officer. The user is Ramesh Kumar, a tomato farmer in Nasik, Maharashtra. Today's date is {{{currentDate}}}.
Generate 3 short intelligence briefings (max 40 words each) about:
(1) current tomato market conditions in Maharashtra,
(2) weather impact on Nasik region crops this week,
(3) one actionable biosecurity recommendation.
Return JSON array with fields: type (PRICE|WEATHER|DISEASE), timestamp (HH:MM format), and body (string).`,
});

const aiIntelligenceFeedFlow = ai.defineFlow(
  {
    name: 'aiIntelligenceFeedFlow',
    inputSchema: AiIntelligenceFeedInputSchema,
    outputSchema: AiIntelligenceFeedOutputSchema,
  },
  async () => {
    const currentDate = new Date().toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const {output} = await aiIntelligenceFeedPrompt({currentDate});
    // The prompt is configured to return a JSON array, which Genkit automatically parses to `output`.
    return output!;
  }
);

export async function getAiIntelligenceFeed(): Promise<AiIntelligenceFeedOutput> {
  return aiIntelligenceFeedFlow();
}
