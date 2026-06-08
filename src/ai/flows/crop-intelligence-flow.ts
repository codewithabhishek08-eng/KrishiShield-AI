'use server';
/**
 * @fileOverview Comprehensive AI crop intelligence brief.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { groq } from '@/lib/groq-client';

const CropIntelligenceInputSchema = z.object({
  cropName: z.string(),
  data: z.string(),
});

const CropIntelligenceOutputSchema = z.object({
  summary: z.string(),
  best_time_to_sell: z.string(),
  risk_factors: z.array(z.string()),
  opportunities: z.array(z.string()),
  farmer_tip: z.string(),
});

const cropIntelligenceFlow = ai.defineFlow(
  {
    name: 'cropIntelligenceFlow',
    inputSchema: CropIntelligenceInputSchema,
    outputSchema: CropIntelligenceOutputSchema,
  },
  async (input) => {
    const system = `You are KrishiShield's main crop intelligence engine. Provide a tactical brief for a farmer. Respond ONLY in valid JSON.`;
    const user = `Context for ${input.cropName}: ${input.data}.
    Return JSON: {summary (40 words), best_time_to_sell (20 words), risk_factors: [string(15 words each)] (3 items), opportunities: [string(15 words each)] (2 items), farmer_tip (25 words)}.`;

    const output = await groq(system, user, {
      json: true,
      temperature: 0.45
    });

    return {
      summary: output?.summary || "Standard growth cycle expected with stable market conditions.",
      best_time_to_sell: output?.best_time_to_sell || "Sell in peak window between October and November.",
      risk_factors: output?.risk_factors || ["Rainfall during harvest", "Inadequate cold storage", "Labor shortage"],
      opportunities: output?.opportunities || ["Organic certification premium", "Export demand rising"],
      farmer_tip: output?.farmer_tip || "Prioritize soil health mapping before next sowing cycle."
    };
  }
);

export async function getCropIntelligence(input: { cropName: string, data: string }) {
  return cropIntelligenceFlow(input);
}
