
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
import { groq } from '@/lib/groq-client';

const ImpactStoryGeneratorInputSchema = z.object({
  farmerName: z.string(),
  crop: z.string(),
  location: z.string(),
});
export type ImpactStoryGeneratorInput = z.infer<typeof ImpactStoryGeneratorInputSchema>;

const ImpactStoryGeneratorOutputSchema = z.object({
  story: z.string(),
});
export type ImpactStoryGeneratorOutput = z.infer<typeof ImpactStoryGeneratorOutputSchema>;

const impactStoryGeneratorFlow = ai.defineFlow(
  {
    name: 'impactStoryGeneratorFlow',
    inputSchema: ImpactStoryGeneratorInputSchema,
    outputSchema: ImpactStoryGeneratorOutputSchema,
  },
  async (input) => {
    const system = "You write short, emotionally resonant first-person impact stories for farmers.";
    const user = `Write a 3-sentence story from ${input.farmerName}, a ${input.crop} farmer in ${input.location}, who protected his livelihood with KrishiShield AI.`;

    const story = await groq(system, user, {
      temperature: 0.7,
      cacheKey: `story-${input.farmerName}-${input.crop}`
    });

    return { story: story || "No story available." };
  }
);

export async function impactStoryGenerator(
  input: ImpactStoryGeneratorInput
): Promise<ImpactStoryGeneratorOutput> {
  return impactStoryGeneratorFlow(input);
}
