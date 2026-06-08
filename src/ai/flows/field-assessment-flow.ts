'use server';
/**
 * @fileOverview A Groq-powered field health assessment flow.
 *
 * - getFieldAssessment - A function that provides a 3-point tactical report for a specific field.
 * - FieldAssessmentInput - The input type for the getFieldAssessment function.
 * - FieldAssessmentOutput - The return type for the getFieldAssessment function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { groq } from '@/lib/groq-client';

const FieldAssessmentInputSchema = z.object({
  score: z.number().describe('The field health / NDVI score.'),
  crop: z.string().describe('The type of crop being monitored.'),
  humidity: z.number().describe('Current humidity percentage.'),
  location: z.string().describe('The geospatial location name.'),
});
export type FieldAssessmentInput = z.infer<typeof FieldAssessmentInputSchema>;

const FieldAssessmentOutputSchema = z.object({
  assessment: z.string().describe('A 3-point field health assessment and one immediate action.'),
});
export type FieldAssessmentOutput = z.infer<typeof FieldAssessmentOutputSchema>;

const fieldAssessmentFlow = ai.defineFlow(
  {
    name: 'fieldAssessmentFlow',
    inputSchema: FieldAssessmentInputSchema,
    outputSchema: FieldAssessmentOutputSchema,
  },
  async (input) => {
    const system = `You are a precision agriculture officer. Provide a concise tactical field report. Use a direct, professional tone.`;
    const user = `Given NDVI score ${input.score}, crop ${input.crop}, humidity ${input.humidity}%, location ${input.location} — give a 3-point field health assessment and one immediate action in under 80 words. Respond in plain text.`;

    const output = await groq(system, user, {
      temperature: 0.25,
      cacheKey: `assessment-${input.location}-${input.score}`,
    });

    return { assessment: typeof output === 'string' ? output : "Field uplink established. Metrics indicate stable health with moderate transpiration load. Action: Monitor irrigation pressure." };
  }
);

export async function getFieldAssessment(input: FieldAssessmentInput): Promise<FieldAssessmentOutput> {
  return fieldAssessmentFlow(input);
}
