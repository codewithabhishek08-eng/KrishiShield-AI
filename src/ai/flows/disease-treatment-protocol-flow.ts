'use server';
/**
 * @fileOverview A Genkit flow for generating step-by-step treatment protocols for plant diseases.
 *
 * - diseaseTreatmentProtocol - A function that handles the generation of a treatment protocol.
 * - DiseaseTreatmentProtocolInput - The input type for the diseaseTreatmentProtocol function.
 * - DiseaseTreatmentProtocolOutput - The return type for the diseaseTreatmentProtocol function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DiseaseTreatmentProtocolInputSchema = z.object({
  diseaseName: z.string().describe('The name of the detected plant disease, e.g., "Alternaria solani (Early Blight)".'),
  cropAndLocation: z.string().describe('The specific crop and location where the disease was detected, e.g., "tomatoes in Maharashtra, India".'),
});
export type DiseaseTreatmentProtocolInput = z.infer<typeof DiseaseTreatmentProtocolInputSchema>;

const TreatmentStepSchema = z.object({
  step_number: z.number().describe('The sequential number of the treatment step.'),
  action: z.string().max(5, 'Action should be max 5 words.').describe('A concise action to be taken, max 5 words.'),
  detail: z.string().max(25, 'Detail should be max 25 words.').describe('A detailed description of the action, max 25 words.'),
  urgency: z.enum(['immediate', 'soon', 'monitor']).describe('The urgency level of the treatment step.'),
});

const DiseaseTreatmentProtocolOutputSchema = z.array(TreatmentStepSchema).describe('An array of step-by-step treatment instructions for the detected disease.');
export type DiseaseTreatmentProtocolOutput = z.infer<typeof DiseaseTreatmentProtocolOutputSchema>;

export async function diseaseTreatmentProtocol(input: DiseaseTreatmentProtocolInput): Promise<DiseaseTreatmentProtocolOutput> {
  return diseaseTreatmentProtocolFlow(input);
}

const prompt = ai.definePrompt({
  name: 'diseaseTreatmentProtocolPrompt',
  model: 'groq/llama-3.3-70b-versatile',
  input: {schema: DiseaseTreatmentProtocolInputSchema},
  output: {schema: DiseaseTreatmentProtocolOutputSchema},
  config: {
    temperature: 0.4,
  },
  prompt: `You are an expert agricultural advisor.

For the disease '{{{diseaseName}}}' detected on '{{{cropAndLocation}}}', give 3 clear and concise treatment steps.

Each step must include:
- step_number: a numerical order for the step.
- action: a brief action description, maximum 5 words.
- detail: a short explanation of the action, maximum 25 words.
- urgency: one of 'immediate', 'soon', or 'monitor'.

Return the output as a JSON array of these steps.`,
});

const diseaseTreatmentProtocolFlow = ai.defineFlow(
  {
    name: 'diseaseTreatmentProtocolFlow',
    inputSchema: DiseaseTreatmentProtocolInputSchema,
    outputSchema: DiseaseTreatmentProtocolOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
