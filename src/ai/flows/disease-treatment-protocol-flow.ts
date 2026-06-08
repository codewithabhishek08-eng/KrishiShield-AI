
'use server';
/**
 * @fileOverview A Genkit flow for generating step-by-step treatment protocols for plant diseases.
 *
 * - diseaseTreatmentProtocol - A function that handles the generation of a treatment protocol.
 * - DiseaseTreatmentProtocolInput - The input type for the diseaseTreatmentProtocol function.
 * - DiseaseTreatmentProtocolOutput - The return type for the diseaseTreatmentProtocol function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { groq } from '@/lib/groq-client';

const DiseaseTreatmentProtocolInputSchema = z.object({
  diseaseName: z.string().describe('The name of the detected plant disease.'),
  cropAndLocation: z.string().describe('The specific crop and location.'),
});
export type DiseaseTreatmentProtocolInput = z.infer<typeof DiseaseTreatmentProtocolInputSchema>;

const TreatmentStepSchema = z.object({
  step_number: z.number().describe('The sequential number of the treatment step.'),
  action: z.string().describe('A concise action to be taken.'),
  detail: z.string().describe('A detailed description of the action.'),
  urgency: z.enum(['immediate', 'soon', 'monitor']).describe('The urgency level.'),
});

const DiseaseTreatmentProtocolOutputSchema = z.array(TreatmentStepSchema);
export type DiseaseTreatmentProtocolOutput = z.infer<typeof DiseaseTreatmentProtocolOutputSchema>;

const diseaseTreatmentProtocolFlow = ai.defineFlow(
  {
    name: 'diseaseTreatmentProtocolFlow',
    inputSchema: DiseaseTreatmentProtocolInputSchema,
    outputSchema: DiseaseTreatmentProtocolOutputSchema,
  },
  async (input) => {
    const system = `You are an expert agricultural advisor. Provide 3 clear treatment steps for the specified disease and crop. Return a JSON array of objects.`;
    const user = `Disease: ${input.diseaseName}, Crop/Location: ${input.cropAndLocation}. Each object needs: step_number (int), action (string, max 5 words), detail (string, max 25 words), urgency (immediate|soon|monitor).`;

    const output = await groq(system, user, {
      json: true,
      temperature: 0.3
    });

    return output || [];
  }
);

export async function diseaseTreatmentProtocol(input: DiseaseTreatmentProtocolInput): Promise<DiseaseTreatmentProtocolOutput> {
  return diseaseTreatmentProtocolFlow(input);
}
