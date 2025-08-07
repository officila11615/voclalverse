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
  parameters: z.record(z.string()).optional().describe('Any parameters or details extracted from the user input that are relevant to fulfilling the intent.'),
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
  prompt: `You are an AI assistant. Your goal is to accurately recognize user intent and provide helpful, actionable responses.
When you receive a transcription of a user's voice command, analyze the intent and reply with the exact answer, action step, or relevant information in a way that a smart voice assistant would.
Never just repeat the intent—always generate a clear and useful response. If the intent isn’t clear, politely ask the user to clarify.

Transcription: {{{transcription}}}

Based on the transcription, determine the user's intent and generate a direct response. For example:
- If the user says "What's the weather like?", your response should be "The weather is sunny with a high of 75 degrees." not "The user is asking about the weather."
- If the user says "Set a timer for 5 minutes", your response should be "Your timer is set for 5 minutes." not "The user wants to set a timer."

Output a JSON object that conforms to the specified output schema.`,
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
