'use server';
/**
 * @fileOverview AI disease risk analysis for specific crops.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { groq } from '@/lib/groq-client';

const DiseaseRiskInputSchema = z.object({
  cropName: z.string(),
  location: z.string(),
});

const RiskItemSchema = z.object({
  disease: z.string(),
  likelihood: z.enum(['high', 'medium', 'low']),
  symptom: z.string(),
  prevention: z.string(),
});

const DiseaseRiskOutputSchema = z.object({
  risks: z.array(RiskItemSchema),
});

const diseaseRiskFlow = ai.defineFlow(
  {
    name: 'diseaseRiskFlow',
    inputSchema: DiseaseRiskInputSchema,
    outputSchema: DiseaseRiskOutputSchema,
  },
  async (input) => {
    const system = `You are a plant pathologist in India. Identify common disease risks for a crop. Respond ONLY in valid JSON.`;
    const user = `Identify 3 common diseases for ${input.cropName} in ${input.location}. Current season context.
    Return JSON: {risks: [{disease, likelihood, symptom (max 10 words), prevention (max 12 words)}]}.`;

    const output = await groq(system, user, {
      json: true,
      temperature: 0.2
    });

    return {
      risks: output?.risks || []
    };
  }
);

export async function getDiseaseRisks(input: { cropName: string, location: string }) {
  return diseaseRiskFlow(input);
}
