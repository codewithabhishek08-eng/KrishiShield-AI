'use server';
/**
 * @fileOverview A Genkit flow to provide AI-driven hedging recommendations.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { groq } from '@/lib/groq-client';

const HedgeAdvisorInputSchema = z.object({
  qty: z.number(),
  price: z.number(),
});
export type HedgeAdvisorInput = z.infer<typeof HedgeAdvisorInputSchema>;

const HedgeAdvisorOutputSchema = z.object({
  recommended_pct: z.number(),
  reason: z.string(),
  risk_if_skip: z.string(),
});
export type HedgeAdvisorOutput = z.infer<typeof HedgeAdvisorOutputSchema>;

const hedgeAdvisorFlow = ai.defineFlow(
  {
    name: 'hedgeAdvisorFlow',
    inputSchema: HedgeAdvisorInputSchema,
    outputSchema: HedgeAdvisorOutputSchema,
  },
  async (input) => {
    const system = `You are a conservative agricultural hedging advisor. Respond ONLY in valid JSON.`;
    const user = `Farmer has ${input.qty}kg tomatoes, current price ₹${input.price}/kg, 6M trend is bullish. How much should they hedge?
    Return JSON: {recommended_pct (40-85), reason (max 15 words), risk_if_skip (max 12 words)}.`;

    const output = await groq(system, user, {
      json: true,
      temperature: 0.3
    });

    return {
      recommended_pct: output?.recommended_pct || 60,
      reason: output?.reason || "Secure core revenue against seasonal volatility.",
      risk_if_skip: output?.risk_if_skip || "Unprotected exposure to potential monsoon price crashes."
    };
  }
);

export async function getHedgeAdvice(input: HedgeAdvisorInput): Promise<HedgeAdvisorOutput> {
  return hedgeAdvisorFlow(input);
}
