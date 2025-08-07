// This file is no longer used for text generation with OpenRouter.
// You can remove it if you are not using Genkit for any other purpose.
// For now, I will leave it in case you want to re-integrate Genkit later.

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});
