'use server';
/**
 * @fileOverview A Genkit flow to explain loan eligibility factors.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { groq } from '@/lib/groq-client';

const EligibilityExplanationInputSchema = z.object({
  healthScore: z.number(),
  riskScore: z.number(),
  amount: z.number(),
});
export type EligibilityExplanationInput = z.infer<typeof EligibilityExplanationInputSchema>;

const EligibilityFactorSchema = z.object({
  label: z.string(),
  impact: z.enum(['positive', 'neutral']),
  note: z.string(),
});

const EligibilityExplanationOutputSchema = z.object({
  summary: z.string(),
  factors: z.array(EligibilityFactorSchema),
});
export type EligibilityExplanationOutput = z.infer<typeof EligibilityExplanationOutputSchema>;

const eligibilityExplanationFlow = ai.defineFlow(
  {
    name: 'eligibilityExplanationFlow',
    inputSchema: EligibilityExplanationInputSchema,
    outputSchema: EligibilityExplanationOutputSchema,
  },
  async (input) => {
    const system = `You are a loan officer explaining an AI-driven credit decision to a farmer. Respond ONLY in valid JSON.`;
    const user = `Health ${input.healthScore}/100, satellite verified, risk score ${input.riskScore}/100, approved ₹${input.amount} at 1%. 
    Explain why in simple terms. Return JSON: {summary (max 40 words), factors: [{label (max 4 words), impact: 'positive'|'neutral', note (max 18 words)}]}.`;

    const output = await groq(system, user, {
      json: true,
      temperature: 0.4
    });

    return {
      summary: output?.summary || "Your strong crop health and satellite-verified field history make you a low-risk candidate.",
      factors: output?.factors || [
        { label: "Crop Health", impact: "positive", note: "High vitality score reduces yield risk." },
        { label: "Verification", impact: "positive", note: "Satellite data confirms plot size and history." }
      ]
    };
  }
);

export async function getEligibilityExplanation(input: EligibilityExplanationInput): Promise<EligibilityExplanationOutput> {
  return eligibilityExplanationFlow(input);
}
