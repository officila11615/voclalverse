'use server';

/**
 * @fileOverview Understands the user's intent from transcribed text.
 *
 * - understandUserIntent - A function that processes user input and returns the identified intent.
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
  parameters: z.record(z.string(), z.unknown()).optional().describe('Any parameters or details extracted from the user input that are relevant to fulfilling the intent.'),
});
export type UnderstandUserIntentOutput = z.infer<typeof UnderstandUserIntentOutputSchema>;

export async function understandUserIntent(input: UnderstandUserIntentInput): Promise<UnderstandUserIntentOutput> {
  return understandUserIntentFlow(input);
}

const understandUserIntentPrompt = ai.definePrompt({
  name: 'understandUserIntentPrompt',
  input: {schema: UnderstandUserIntentInputSchema},
  output: {schema: UnderstandUserIntentOutputSchema},
  prompt: `You are a virtual assistant that analyzes user voice commands to understand their intent.
  Given the following transcription, identify the user's intent, the action to be taken (if any), and any relevant parameters.

  Transcription: {{{transcription}}}

  Output a JSON object containing the following fields:
  - intent: A brief description of the user's intent.
  - action (optional): The action to be taken based on the intent (e.g., schedule_event, get_weather, play_music).
  - parameters (optional): A JSON object containing any parameters or details extracted from the user input that are relevant to fulfilling the intent. For example, if the intent is to schedule an event, the parameters might include the event name, date, time, and location.

  Ensure that the output is a valid JSON object that conforms to the UnderstandUserIntentOutputSchema schema.
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
