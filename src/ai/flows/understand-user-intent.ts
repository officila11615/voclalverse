'use server';

/**
 * @fileOverview Calls the OpenRouter API to get a response from a specified model.
 *
 * - getOpenRouterResponse - A function that takes a user's message and returns an AI-generated response.
 * - GetOpenRouterResponseInput - The input type for the getOpenRouterResponse function.
 * - GetOpenRouterResponseOutput - The return type for the getOpenRouterResponse function.
 */

import {z} from 'zod';

const GetOpenRouterResponseInputSchema = z.object({
  transcription: z.string().describe("The user's message."),
});
export type GetOpenRouterResponseInput = z.infer<typeof GetOpenRouterResponseInputSchema>;

const GetOpenRouterResponseOutputSchema = z.object({
  response: z.string().describe('The AI-generated response.'),
});
export type GetOpenRouterResponseOutput = z.infer<typeof GetOpenRouterResponseOutputSchema>;

export async function getOpenRouterResponse(
  input: GetOpenRouterResponseInput
): Promise<GetOpenRouterResponseOutput> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: "Act as an AI assistant that accurately recognizes user intent and provides helpful, actionable responses. When I speak or type something, analyze the intent and reply with the exact answer, action step, or relevant information in a way that a smart voice assistant would. Never just repeat the intent—always generate a clear and useful response. If the intent isn’t clear, politely ask the user to clarify.",
          },
          { role: 'user', content: input.transcription },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('OpenRouter API Error:', errorBody);
      throw new Error(`OpenRouter API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || 'Sorry, I could not get a response.';
    
    return GetOpenRouterResponseOutputSchema.parse({ response: aiResponse });

  } catch (error) {
    console.error('Failed to call OpenRouter API', error);
    throw new Error('Failed to get response from OpenRouter.');
  }
}
