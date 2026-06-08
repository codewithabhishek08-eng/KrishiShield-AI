'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating personalized impact stories using Groq.
 *
 * - impactStoryGenerator: A function that generates a personalized impact story.
 * - ImpactStoryGeneratorInput: The input type for the impactStoryGenerator function.
 * - ImpactStoryGeneratorOutput: The return type for the impactStoryGenerator function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ImpactStoryGeneratorInputSchema = z.object({
  farmerName: z.string().describe('The name of the farmer for whom the story is generated.'),
  crop: z.string().describe('The primary crop the farmer grows.'),
  location: z.string().describe('The geographical location of the farmer.'),
});
export type ImpactStoryGeneratorInput = z.infer<typeof ImpactStoryGeneratorInputSchema>;

const ImpactStoryGeneratorOutputSchema = z.object({
  story: z.string().describe('A 3-sentence first-person impact story.'),
});
export type ImpactStoryGeneratorOutput = z.infer<typeof ImpactStoryGeneratorOutputSchema>;

const impactStoryPrompt = ai.definePrompt({
  name: 'impactStoryPrompt',
  model: 'groq/llama-3.3-70b-versatile',
  input: { schema: ImpactStoryGeneratorInputSchema },
  output: { schema: ImpactStoryGeneratorOutputSchema },
  config: {
    temperature: 0.7,
  },
  prompt: `Write a 3-sentence first-person impact story from {{{farmerName}}}, a {{{crop}}} farmer in {{{location}}}, who used KrishiShield AI to protect his income. Make it emotionally resonant and specific. Plain text, no formatting. The story should sound like it's from a real farmer sharing their experience.`,
});

const impactStoryGeneratorFlow = ai.defineFlow(
  {
    name: 'impactStoryGeneratorFlow',
    inputSchema: ImpactStoryGeneratorInputSchema,
    outputSchema: ImpactStoryGeneratorOutputSchema,
  },
  async (input) => {
    const { output } = await impactStoryPrompt(input);
    if (!output) {
      throw new Error('Failed to generate impact story.');
    }
    return output;
  }
);

export async function impactStoryGenerator(
  input: ImpactStoryGeneratorInput
): Promise<ImpactStoryGeneratorOutput> {
  return impactStoryGeneratorFlow(input);
}
