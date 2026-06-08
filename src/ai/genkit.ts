
import { genkit } from 'genkit';
import { groq } from 'genkitx-groq';

/**
 * Genkit initialization using Groq as the primary provider.
 * The Groq API key is expected to be in the GROQ_API_KEY environment variable.
 */
export const ai = genkit({
  plugins: [
    // Correctly initialize the Groq plugin. 
    // genkitx-groq 0.1.1 works by being called directly in the plugins array.
    groq(),
  ],
  model: 'groq/llama-3.3-70b-versatile',
});
