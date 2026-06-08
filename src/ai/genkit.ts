import { genkit } from 'genkit';
import { groq } from 'genkitx-groq';

/**
 * Genkit initialization using Groq as the primary provider.
 * The Groq API key is expected to be in the GROQ_API_KEY environment variable.
 */
export const ai = genkit({
  plugins: [
    // In Genkit 1.x, the plugins array expects PluginProvider functions.
    // genkitx-groq's 'groq' export is the provider function itself.
    groq,
  ],
  model: 'groq/llama-3.3-70b-versatile',
});
