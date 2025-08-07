// Use server directive is required when using Genkit flows in Next.js
'use server';

/**
 * @fileOverview This file defines a Genkit flow that takes transcribed text as input and generates a spoken response using a TTS model.
 *
 * - generateSpokenResponse - A function that handles the generation of the spoken response.
 * - GenerateSpokenResponseInput - The input type for the generateSpokenResponse function.
 * - GenerateSpokenResponseOutput - The return type for the generateSpokenResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';

const GenerateSpokenResponseInputSchema = z.object({
  text: z.string().describe('The transcribed text from the user.'),
});
export type GenerateSpokenResponseInput = z.infer<typeof GenerateSpokenResponseInputSchema>;

const GenerateSpokenResponseOutputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      'The spoken response as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
});
export type GenerateSpokenResponseOutput = z.infer<typeof GenerateSpokenResponseOutputSchema>;

export async function generateSpokenResponse(
  input: GenerateSpokenResponseInput
): Promise<GenerateSpokenResponseOutput> {
  return generateSpokenResponseFlow(input);
}

const generateSpokenResponseFlow = ai.defineFlow(
  {
    name: 'generateSpokenResponseFlow',
    inputSchema: GenerateSpokenResponseInputSchema,
    outputSchema: GenerateSpokenResponseOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.5-flash-preview-tts',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {voiceName: 'Algenib'},
          },
        },
      },
      prompt: input.text,
    });

    if (!media) {
      throw new Error('No media returned from TTS model.');
    }

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );
    return {
      audioDataUri: 'data:audio/wav;base64,' + (await toWav(audioBuffer)),
    };
  }
);

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    const bufs = [] as any[];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}
