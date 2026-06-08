'use server';
/**
 * @fileOverview This file implements a Genkit flow to generate AI-powered intelligence briefings for farmers.
 *
 * - getAiIntelligenceFeed - A function that fetches AI-generated intelligence briefings.
 * - AiIntelligenceFeedInput - The input type for the getAiIntelligenceFeed function.
 * - AiIntelligenceFeedOutput - The return type for the getAiIntelligenceFeed function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { groq } from '@/lib/groq-client';

const AiIntelligenceFeedInputSchema = z.void();
export type AiIntelligenceFeedInput = z.infer<typeof AiIntelligenceFeedInputSchema>;

const BriefingItemSchema = z.object({
  type: z.enum(['PRICE', 'WEATHER', 'DISEASE']).describe('The type of briefing (PRICE, WEATHER, DISEASE).'),
  timestamp: z.string().regex(/^\d{2}:\d{2}$/).describe('The timestamp in HH:MM format.'),
  body: z.string().max(100).describe('The intelligence briefing message, max 40 words.'),
});

const AiIntelligenceFeedOutputSchema = z.array(BriefingItemSchema);
export type AiIntelligenceFeedOutput = z.infer<typeof AiIntelligenceFeedOutputSchema>;

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

    const system = `You are an agricultural intelligence officer. The user is Ramesh Kumar, a tomato farmer in Nasik, Maharashtra. Today's date is ${currentDate}.
Generate 3 short intelligence briefings (max 40 words each) about:
(1) current tomato market conditions in Maharashtra,
(2) weather impact on Nasik region crops this week,
(3) one actionable biosecurity recommendation.
Return a JSON object with a single key 'briefings' containing an array of objects with fields: type (PRICE|WEATHER|DISEASE), timestamp (HH:MM format), and body (string).
The 'type' field MUST be exactly 'PRICE', 'WEATHER', or 'DISEASE' in uppercase.`;

    const user = "Generate the briefings now.";

    const output = await groq(system, user, {
      json: true,
      cacheKey: `feed-${currentDate}`,
      temperature: 0.4
    });

    // Normalize output to ensure enum compliance
    const briefings = (output?.briefings || []).map((b: any) => {
      let type = String(b.type || 'WEATHER').toUpperCase();
      if (!['PRICE', 'WEATHER', 'DISEASE'].includes(type)) type = 'WEATHER';
      return {
        type: type as 'PRICE' | 'WEATHER' | 'DISEASE',
        timestamp: String(b.timestamp || '09:00'),
        body: String(b.body || 'Uplink active. Monitoring field data.'),
      };
    });

    return briefings;
  }
);

export async function getAiIntelligenceFeed(): Promise<AiIntelligenceFeedOutput> {
  return aiIntelligenceFeedFlow();
}
