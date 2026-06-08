
import { genkit } from 'genkit';

/**
 * Genkit initialization. 
 * We use a simple initialization to support Genkit Flows.
 * The actual AI calls are routed through the optimized Groq client.
 */
export const ai = genkit({
  plugins: [],
});
