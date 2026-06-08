'use server';
/**
 * @fileOverview A Genkit flow to provide AI-driven loan advice for farmers.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { groq } from '@/lib/groq-client';

const LoanAdvisorInputSchema = z.object({
  amount: z.number(),
  healthScore: z.number(),
});
export type LoanAdvisorInput = z.infer<typeof LoanAdvisorInputSchema>;

const LoanAdvisorOutputSchema = z.object({
  advice: z.string(),
  optimal_amount: z.number(),
  repayment_tip: z.string(),
});
export type LoanAdvisorOutput = z.infer<typeof LoanAdvisorOutputSchema>;

const loanAdvisorFlow = ai.defineFlow(
  {
    name: 'loanAdvisorFlow',
    inputSchema: LoanAdvisorInputSchema,
    outputSchema: LoanAdvisorOutputSchema,
  },
  async (input) => {
    const system = `You are an AI loan advisor for Indian smallholder farmers. Respond ONLY in valid JSON.`;
    const user = `Farmer wants ₹${input.amount} loan. Crop health ${input.healthScore}/100. Harvest in ~4 months. Tomato price bullish. 
    Return JSON: {advice (max 20 words), optimal_amount (number), repayment_tip (max 15 words)}.`;

    const output = await groq(system, user, {
      json: true,
      temperature: 0.3
    });

    return {
      advice: output?.advice || "Consider a slightly smaller amount to keep interest costs low until harvest.",
      optimal_amount: output?.optimal_amount || Math.round(input.amount * 0.9),
      repayment_tip: output?.repayment_tip || "Align your primary repayment with the late-October harvest window."
    };
  }
);

export async function getLoanAdvice(input: LoanAdvisorInput): Promise<LoanAdvisorOutput> {
  return loanAdvisorFlow(input);
}
