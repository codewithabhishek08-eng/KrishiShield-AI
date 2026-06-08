'use server';
/**
 * @fileOverview AI weather assessment for specific crop needs.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { groq } from '@/lib/groq-client';

const WeatherAssessmentInputSchema = z.object({
  cropName: z.string(),
  ideal: z.string(),
  current: z.string(),
});

const WeatherAssessmentOutputSchema = z.object({
  match_score: z.number(),
  assessment: z.string(),
  recommendations: z.array(z.string()),
});

const weatherAssessmentFlow = ai.defineFlow(
  {
    name: 'weatherAssessmentFlow',
    inputSchema: WeatherAssessmentInputSchema,
    outputSchema: WeatherAssessmentOutputSchema,
  },
  async (input) => {
    const system = `You are an expert agricultural weather advisor. Evaluate if current weather is ideal for a specific crop. Respond ONLY in valid JSON.`;
    const user = `Crop: ${input.cropName}. Ideal: ${input.ideal}. Current Weather: ${input.current}.
    Return JSON: {match_score (0-100), assessment (max 15 words), recommendations: [max 12 words each] (2 items)}.`;

    const output = await groq(system, user, {
      json: true,
      temperature: 0.3
    });

    return {
      match_score: output?.match_score || 85,
      assessment: output?.assessment || "Conditions are generally favorable but watch for midday heat stress.",
      recommendations: output?.recommendations || ["Increase watering in evening", "Mulch soil to retain moisture"]
    };
  }
);

export async function getWeatherAssessment(input: { cropName: string, ideal: string, current: string }) {
  return weatherAssessmentFlow(input);
}
