'use server';

/**
 * @fileOverview A voice transcription AI agent.
 *
 * - transcribeVoice - A function that handles the voice transcription process.
 * - TranscribeVoiceInput - The input type for the transcribeVoice function.
 * - TranscribeVoiceOutput - The return type for the transcribeVoice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranscribeVoiceInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "A recording of the user's voice, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type TranscribeVoiceInput = z.infer<typeof TranscribeVoiceInputSchema>;

const TranscribeVoiceOutputSchema = z.object({
  transcription: z.string().describe('The transcribed text from the audio.'),
});
export type TranscribeVoiceOutput = z.infer<typeof TranscribeVoiceOutputSchema>;

export async function transcribeVoice(input: TranscribeVoiceInput): Promise<TranscribeVoiceOutput> {
  return transcribeVoiceFlow(input);
}

const transcribeVoicePrompt = ai.definePrompt({
  name: 'transcribeVoicePrompt',
  input: {schema: TranscribeVoiceInputSchema},
  output: {schema: TranscribeVoiceOutputSchema},
  prompt: `Transcribe the following audio recording to text:

{{media url=audioDataUri}}`,
});

const transcribeVoiceFlow = ai.defineFlow(
  {
    name: 'transcribeVoiceFlow',
    inputSchema: TranscribeVoiceInputSchema,
    outputSchema: TranscribeVoiceOutputSchema,
  },
  async input => {
    const {output} = await transcribeVoicePrompt(input);
    return output!;
  }
);
