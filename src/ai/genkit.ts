import { genkit } from 'genkit';
import { groq } from 'genkitx-groq';

/**
 * Genkit initialization using Groq as the primary provider.
 * The Groq API key is expected to be in the GROQ_API_KEY environment variable.
 */
export const ai = genkit({
  plugins: [
    // Wrap the groq plugin in a function to ensure it matches the PluginProvider interface expected by Genkit 1.x
    () => groq(),
  ],
  model: 'groq/llama-3.3-70b-versatile',
});
