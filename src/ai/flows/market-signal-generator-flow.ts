'use server';
/**
 * @fileOverview A Genkit flow to generate AI-powered market signal cards for agricultural produce.
 *
 * - generateMarketSignals - A function that handles the generation of market signals.
 * - MarketSignalInput - The input type for the generateMarketSignals function.
 * - MarketSignalOutput - The return type for the generateMarketSignals function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MarketSignalInputSchema = z.object({
  crop: z.string().default('tomato').describe('The crop for which to generate market signals.'),
  region: z.string().default('Maharashtra, India').describe('The region for which to generate market signals.'),
  duration: z.string().default('next 6 months').describe('The duration for the market signals.'),
});
export type MarketSignalInput = z.infer<typeof MarketSignalInputSchema>;

const MarketSignalSchema = z.object({
  icon_name: z.string().describe('A relevant emoji for the market signal.'),
  title: z.string().describe('A short title for the signal (max 4 words).'),
  detail: z.string().describe('A one-sentence insight (max 20 words).'),
  sentiment: z.enum(['bullish', 'bearish', 'neutral']).describe('The sentiment of the market signal.'),
});

const MarketSignalOutputSchema = z.array(MarketSignalSchema).min(4).max(4).describe('An array of 4 market signals.');
export type MarketSignalOutput = z.infer<typeof MarketSignalOutputSchema>;

const marketSignalPrompt = ai.definePrompt({
  name: 'marketSignalPrompt',
  input: {schema: MarketSignalInputSchema},
  output: {schema: MarketSignalOutputSchema},
  model: 'googleai/gemini-2.5-flash',
  config: {
    temperature: 0.4,
  },
  prompt: `You are an agricultural market analyst.
Generate 4 market signals for {{{crop}}} prices in {{{region}}} for the {{{duration}}}.
Each signal must have:
- icon_name (a relevant emoji)
- title (4 words max)
- detail (one sentence, max 20 words)
- sentiment (bullish|bearish|neutral)

Return the response as a JSON array of objects. Ensure the JSON strictly adheres to this structure:
\`\`\`json
[
  {
    "icon_name": "string",
    "title": "string",
    "detail": "string",
    "sentiment": "bullish | bearish | neutral"
  }
]
\`\`\`
`,
});

const marketSignalGeneratorFlow = ai.defineFlow(
  {
    name: 'marketSignalGeneratorFlow',
    inputSchema: MarketSignalInputSchema,
    outputSchema: MarketSignalOutputSchema,
  },
  async (input) => {
    try {
      const {output} = await marketSignalPrompt(input);
      if (!output) {
        throw new Error('Failed to generate market signals: No output received.');
      }
      return output;
    } catch (error) {
      console.error('Error generating market signals:', error);
      // Graceful fallback payload as per requirements.
      // This fallback must strictly conform to MarketSignalOutputSchema.
      return [
        {
          icon_name: '⚠️',
          title: 'Data Unavailable',
          detail: 'Market signals could not be fetched.',
          sentiment: 'neutral',
        },
        {
          icon_name: '🔄',
          title: 'Refreshing Soon',
          detail: 'Please try again in a moment for updates.',
          sentiment: 'neutral',
        },
        {
          icon_name: '📈',
          title: 'Steady Market',
          detail: 'Current trends indicate stability.',
          sentiment: 'neutral',
        },
        {
          icon_name: '🌾',
          title: 'Harvest Watch',
          detail: 'Monitor harvest reports closely.',
          sentiment: 'neutral',
        },
      ];
    }
  }
);

export async function generateMarketSignals(input: MarketSignalInput = {}): Promise<MarketSignalOutput> {
  const validatedInput = MarketSignalInputSchema.parse(input);
  return marketSignalGeneratorFlow(validatedInput);
}
