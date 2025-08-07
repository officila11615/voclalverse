
'use server';

/**
 * @fileOverview A flow that translates text from a source language to a target language
 * and generates speech for the translated text.
 *
 * - translateAndSpeak - A function that handles the translation and speech synthesis process.
 * - TranslateAndSpeakInput - The input type for the translateAndSpeak function.
 * - TranslateAndSpeakOutput - The return type for the translateAndSpeak function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';

// Define available languages and their corresponding voice/language codes
export const languageOptions = [
  { value: 'en-US', label: 'English (US)', voice: 'en-US-Neural2-J' },
  { value: 'es-ES', label: 'Spanish (Spain)', voice: 'es-ES-Neural2-F' },
  { value: 'fr-FR', label: 'French (France)', voice: 'fr-FR-Neural2-D' },
  { value: 'de-DE', label: 'German (Germany)', voice: 'de-DE-Neural2-F' },
  { value: 'it-IT', label: 'Italian (Italy)', voice: 'it-IT-Neural2-A' },
  { value: 'ja-JP', label: 'Japanese (Japan)', voice: 'ja-JP-Neural2-B' },
  { value: 'ko-KR', label: 'Korean (South Korea)', voice: 'ko-KR-Wavenet-C' },
];

const TranslateAndSpeakInputSchema = z.object({
  text: z.string().describe('The text to translate.'),
  sourceLanguage: z.string().describe('The IETF BCP-47 language code of the source text (e.g., "en-US").'),
  targetLanguage: z.string().describe('The IETF BCP-47 language code for the translation (e.g., "es-ES").'),
});
export type TranslateAndSpeakInput = z.infer<typeof TranslateAndSpeakInputSchema>;

const TranslateAndSpeakOutputSchema = z.object({
  translation: z.string().describe('The translated text.'),
  audioDataUri: z.string().describe("The synthesized speech for the translated text, as a base64-encoded WAV data URI."),
});
export type TranslateAndSpeakOutput = z.infer<typeof TranslateAndSpeakOutputSchema>;

// This prompt translates the text using Gemini.
const translatePrompt = ai.definePrompt({
    name: 'translatePrompt',
    input: { schema: TranslateAndSpeakInputSchema },
    output: { schema: z.object({ translation: z.string() }) },
    prompt: `Translate the following text from {{sourceLanguage}} to {{targetLanguage}}: {{{text}}}`,
});

// Main flow function
export async function translateAndSpeak(input: TranslateAndSpeakInput): Promise<TranslateAndSpeakOutput> {
  return translateAndSpeakFlow(input);
}


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

    let bufs = [] as any[];
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

const translateAndSpeakFlow = ai.defineFlow(
    {
      name: 'translateAndSpeakFlow',
      inputSchema: TranslateAndSpeakInputSchema,
      outputSchema: TranslateAndSpeakOutputSchema,
    },
    async (input) => {
      // Step 1: Translate the text
      const translationResponse = await translatePrompt(input);
      const translatedText = translationResponse.output?.translation;

      if (!translatedText) {
        throw new Error('Translation failed or returned no text.');
      }
      
      const targetLanguageInfo = languageOptions.find(lang => lang.value === input.targetLanguage);

      if (!targetLanguageInfo) {
        throw new Error(`Unsupported target language: ${input.targetLanguage}`);
      }

      // Step 2: Synthesize speech from the translated text
      const { media } = await ai.generate({
        model: 'googleai/gemini-2.5-flash-preview-tts',
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              customVoiceConfig: {
                voiceName: targetLanguageInfo.voice,
              }
            },
          },
        },
        prompt: translatedText,
      });

      if (!media) {
        throw new Error('Text-to-speech synthesis failed to return audio.');
      }
      
      const audioBuffer = Buffer.from(
        media.url.substring(media.url.indexOf(',') + 1),
        'base64'
      );
      const wavBase64 = await toWav(audioBuffer);

      return {
        translation: translatedText,
        audioDataUri: `data:audio/wav;base64,${wavBase64}`,
      };
    }
);
