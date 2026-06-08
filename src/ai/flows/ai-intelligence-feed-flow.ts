
'use server';
/**
 * @fileOverview This file implements a Genkit flow to generate AI-powered intelligence briefings for farmers.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { groq } from '@/lib/groq-client';

const AiIntelligenceFeedInputSchema = z.object({
  city: z.string(),
  state: z.string(),
  crop: z.string(),
  name: z.string(),
});
export type AiIntelligenceFeedInput = z.infer<typeof AiIntelligenceFeedInputSchema>;

const BriefingItemSchema = z.object({
  type: z.enum(['PRICE', 'WEATHER', 'DISEASE']).describe('The type of briefing.'),
  timestamp: z.string().describe('HH:MM format.'),
  body: z.string().max(100).describe('The intelligence briefing message.'),
});

const AiIntelligenceFeedOutputSchema = z.array(BriefingItemSchema);
export type AiIntelligenceFeedOutput = z.infer<typeof AiIntelligenceFeedOutputSchema>;

const aiIntelligenceFeedFlow = ai.defineFlow(
  {
    name: 'aiIntelligenceFeedFlow',
    inputSchema: AiIntelligenceFeedInputSchema,
    outputSchema: AiIntelligenceFeedOutputSchema,
  },
  async (input) => {
    const currentDate = new Date().toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const system = `You are an agricultural intelligence officer. The user is ${input.name}, a ${input.crop} farmer in ${input.city}, ${input.state}. Today's date is ${currentDate}.
    Generate 3 short intelligence briefings (max 40 words each) about:
    (1) current ${input.crop} market conditions in ${input.state},
    (2) weather impact on ${input.city} region crops this week,
    (3) one actionable biosecurity recommendation.
    Return JSON object with key 'briefings' containing an array of objects: {type: 'PRICE'|'WEATHER'|'DISEASE', timestamp: 'HH:MM', body: string}.`;

    const output = await groq(system, "Generate the briefings now.", {
      json: true,
      temperature: 0.4
    });

    const briefings = (output?.briefings || []).map((b: any) => ({
      type: (['PRICE', 'WEATHER', 'DISEASE'].includes(String(b.type).toUpperCase()) ? String(b.type).toUpperCase() : 'WEATHER') as 'PRICE' | 'WEATHER' | 'DISEASE',
      timestamp: String(b.timestamp || '09:00'),
      body: String(b.body || 'Uplink active. Monitoring field data.'),
    }));

    return briefings;
  }
);

export async function getAiIntelligenceFeed(input: AiIntelligenceFeedInput): Promise<AiIntelligenceFeedOutput> {
  return aiIntelligenceFeedFlow(input);
}
