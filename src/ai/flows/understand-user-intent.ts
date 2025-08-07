'use server';

/**
 * @fileOverview Understands the user's intent from transcribed text and generates a helpful response.
 *
 * - understandUserIntent - A function that processes user input and returns the identified intent and a generated response.
 * - UnderstandUserIntentInput - The input type for the understandUserIntent function.
 * - UnderstandUserIntentOutput - The return type for the understandUserIntent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const UnderstandUserIntentInputSchema = z.object({
  transcription: z.string().describe('The transcribed text from the user\'s voice input.'),
});
export type UnderstandUserIntentInput = z.infer<typeof UnderstandUserIntentInputSchema>;

const UnderstandUserIntentOutputSchema = z.object({
  intent: z.string().describe('The identified intent of the user, such as scheduling an event, asking a question, or requesting information.'),
  action: z.string().optional().describe('The action to be taken based on the identified intent.'),
  parameters: z.record(z.any()).optional().describe('Any parameters or details extracted from the user input that are relevant to fulfilling the intent.'),
  response: z.string().describe('A helpful, generated response to the user based on their request.'),
});
export type UnderstandUserIntentOutput = z.infer<typeof UnderstandUserIntentOutputSchema>;

export async function understandUserIntent(input: UnderstandUserIntentInput): Promise<UnderstandUserIntentOutput> {
  return understandUserIntentFlow(input);
}

const understandUserIntentPrompt = ai.definePrompt({
  name: 'understandUserIntentPrompt',
  input: {schema: UnderstandUserIntentInputSchema},
  output: {schema: UnderstandUserIntentOutputSchema},
  prompt: `You are a helpful virtual assistant. Analyze the user's voice command to understand their intent and generate a helpful response.
  Given the following transcription, identify the user's intent, any relevant parameters, and what action should be taken.
  Most importantly, generate a concise and helpful response to the user's request.

  For example, if the user says "schedule a meeting for tomorrow at 2pm", your response should be something like "OK, I've scheduled a meeting for tomorrow at 2pm. Is there anything else I can help with?".
  If the user asks a question, answer it.

  Transcription: {{{transcription}}}

  Output a JSON object that conforms to the specified output schema.
  `,
});

const understandUserIntentFlow = ai.defineFlow(
  {
    name: 'understandUserIntentFlow',
    inputSchema: UnderstandUserIntentInputSchema,
    outputSchema: UnderstandUserIntentOutputSchema,
  },
  async input => {
    const {output} = await understandUserIntentPrompt(input);
    return output!;
  }
);
